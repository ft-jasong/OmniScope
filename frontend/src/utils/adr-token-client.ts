import { Connection, PublicKey, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount
} from '@solana/spl-token';

// 프로그램 ID와 토큰 소수점 설정
export const PROGRAM_ID = new PublicKey('5HpQYMJoWoiicn8qnYFCTARaL1JkWht5Dcs1BBHGmJg4');
export const DECIMALS = 6;

// 네트워크 설정 - DevNet 사용
export const SOLANA_NETWORK = 'devnet';
export const SOLANA_ENDPOINT = 'https://api.devnet.solana.com';

// 임시 토큰 민트 주소 (실제 배포 시 교체 필요)
// 실제 ADR 토큰 민트 주소가 제공되면 이 값을 교체해야 함
export const ADR_TOKEN_MINT = new PublicKey('ADRTokenMintAddressHere'); // 실제 토큰 민트 주소로 교체 필요

/**
 * 사용자의 ADR 토큰 잔액을 조회하는 함수
 * @param {Connection} connection - Solana 연결 객체
 * @param {PublicKey} ownerPublicKey - 소유자의 공개키
 * @returns {Promise<number>} - 토큰 잔액
 */
export async function getADRTokenBalance(connection: Connection, ownerPublicKey: PublicKey): Promise<number> {
  try {
    // 토큰 계정 주소 가져오기
    const tokenAccount = await getAssociatedTokenAddress(
      ADR_TOKEN_MINT,
      ownerPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    try {
      // 계정 정보 조회
      const accountInfo = await getAccount(connection, tokenAccount);
      
      // lamports를 실제 토큰 양으로 변환
      const balance = Number(accountInfo.amount) / Math.pow(10, DECIMALS);
      
      return balance;
    } catch (error: any) {
      // 계정이 존재하지 않으면 0 반환
      if (error.name === 'TokenAccountNotFoundError') {
        return 0;
      }
      throw error;
    }
  } catch (error) {
    console.error('토큰 잔액 조회 중 오류 발생:', error);
    return 0;
  }
}

/**
 * ADR 토큰을 다른 지갑으로 전송하는 함수
 * @param {Connection} connection - Solana 연결 객체
 * @param {PublicKey} senderPublicKey - 보내는 사람의 공개키
 * @param {PublicKey} recipientPublicKey - 받는 사람의 공개키
 * @param {number} amount - 전송할 토큰 양
 * @returns {Transaction} - 서명을 위한 트랜잭션 객체
 */
export async function createTransferTransaction(
  connection: Connection,
  senderPublicKey: PublicKey,
  recipientPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  try {
    // 금액을 lamports로 변환
    const amountLamports = Math.floor(amount * Math.pow(10, DECIMALS));
    
    // 보내는 사람의 토큰 계정 주소 가져오기
    const senderTokenAccount = await getAssociatedTokenAddress(
      ADR_TOKEN_MINT,
      senderPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // 받는 사람의 토큰 계정 주소 가져오기
    const recipientTokenAccount = await getAssociatedTokenAddress(
      ADR_TOKEN_MINT,
      recipientPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // 트랜잭션 객체 생성
    const transaction = new Transaction();
    
    // 받는 사람의 토큰 계정이 존재하는지 확인
    let recipientTokenAccountInfo;
    try {
      recipientTokenAccountInfo = await getAccount(
        connection,
        recipientTokenAccount
      );
    } catch (error: any) {
      // 계정이 존재하지 않으면 생성
      if (error.name === 'TokenAccountNotFoundError') {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderPublicKey, // 지불자
            recipientTokenAccount, // 생성할 계정
            recipientPublicKey, // 소유자
            ADR_TOKEN_MINT, // 토큰 민트
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      } else {
        throw error;
      }
    }
    
    // 토큰 전송 명령 추가
    transaction.add(
      createTransferInstruction(
        senderTokenAccount, // 보내는 계정
        recipientTokenAccount, // 받는 계정
        senderPublicKey, // 소유자
        amountLamports, // 금액
        [], // 멀티시그너 (필요 없음)
        TOKEN_PROGRAM_ID
      )
    );
    
    // 최근 블록해시 가져오기
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;
    
    return transaction;
  } catch (error) {
    console.error('토큰 전송 트랜잭션 생성 중 오류 발생:', error);
    throw error;
  }
}

/**
 * Phantom 지갑을 사용하여 트랜잭션에 서명하고 전송하는 함수
 * @param {Transaction} transaction - 서명할 트랜잭션 객체
 * @returns {Promise<string>} - 트랜잭션 서명
 */
export async function signAndSendTransaction(transaction: Transaction): Promise<string> {
  try {
    const phantom = window.phantom?.solana;
    if (!phantom) {
      throw new Error('Phantom wallet not found');
    }
    
    // 트랜잭션을 직렬화하여 Phantom 지갑으로 전송
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });
    
    // Phantom 지갑으로 트랜잭션 전송
    const signature = await phantom.request({
      method: 'signAndSendTransaction',
      params: {
        message: serializedTransaction.toString('base64')
      }
    });
    
    return signature;
  } catch (error) {
    console.error('트랜잭션 서명 및 전송 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 스테이킹 함수
 * @param {Connection} connection - Solana 연결 객체
 * @param {PublicKey} userPublicKey - 사용자의 공개키
 * @param {number} amount - 스테이킹할 토큰 양
 * @returns {Promise<string>} - 트랜잭션 서명
 */
export async function stakeTokens(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: number
): Promise<string> {
  try {
    // 스테이킹 풀 주소 (실제 주소로 교체 필요)
    const stakingPoolAddress = new PublicKey('StakingPoolAddressHere');
    
    // 트랜잭션 생성 로직 (실제 스마트 컨트랙트에 맞게 수정 필요)
    const transaction = await createStakingTransaction(
      connection,
      userPublicKey,
      stakingPoolAddress,
      amount
    );
    
    // 트랜잭션 서명 및 전송
    const signature = await signAndSendTransaction(transaction);
    
    return signature;
  } catch (error) {
    console.error('스테이킹 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 스테이킹 트랜잭션 생성 함수
 * @param {Connection} connection - Solana 연결 객체
 * @param {PublicKey} userPublicKey - 사용자의 공개키
 * @param {PublicKey} stakingPoolAddress - 스테이킹 풀 주소
 * @param {number} amount - 스테이킹할 토큰 양
 * @returns {Promise<Transaction>} - 트랜잭션 객체
 */
async function createStakingTransaction(
  connection: Connection,
  userPublicKey: PublicKey,
  stakingPoolAddress: PublicKey,
  amount: number
): Promise<Transaction> {
  // 금액을 lamports로 변환
  const amountLamports = Math.floor(amount * Math.pow(10, DECIMALS));
  
  // 사용자의 토큰 계정 주소 가져오기
  const userTokenAccount = await getAssociatedTokenAddress(
    ADR_TOKEN_MINT,
    userPublicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // 스테이킹 볼트 PDA (실제 로직에 맞게 수정 필요)
  const [stakingVault] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), stakingPoolAddress.toBuffer()],
    PROGRAM_ID
  );
  
  // 트랜잭션 객체 생성
  const transaction = new Transaction();
  
  // 스테이킹 명령 추가 (실제 스마트 컨트랙트에 맞게 수정 필요)
  // 이 부분은 실제 스마트 컨트랙트의 구조에 따라 달라질 수 있음
  transaction.add(
    createTransferInstruction(
      userTokenAccount, // 보내는 계정
      stakingVault, // 받는 계정 (스테이킹 볼트)
      userPublicKey, // 소유자
      amountLamports, // 금액
      [], // 멀티시그너 (필요 없음)
      TOKEN_PROGRAM_ID
    )
  );
  
  // 최근 블록해시 가져오기
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = userPublicKey;
  
  return transaction;
}

/**
 * Solana 연결 객체 생성 함수
 * @param {string} network - 네트워크 (mainnet-beta, testnet, devnet)
 * @returns {Connection} - Solana 연결 객체
 */
export function getConnection(network: string = SOLANA_NETWORK): Connection {
  let endpoint;
  
  if (network === 'mainnet-beta') {
    endpoint = 'https://api.mainnet-beta.solana.com';
  } else if (network === 'testnet') {
    endpoint = 'https://api.testnet.solana.com';
  } else {
    // 기본값은 devnet
    endpoint = SOLANA_ENDPOINT;
  }
  
  return new Connection(endpoint, 'confirmed');
}
