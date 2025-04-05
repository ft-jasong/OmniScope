import { Connection, PublicKey, Keypair, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount
} from '@solana/spl-token';

// 프로그램 ID와 토큰 소수점 설정
export const PROGRAM_ID = new PublicKey('6yUy54QMKPVx8iGVid1EoqCBGizzf7JRvKEseQb4usFu');
export const DECIMALS = 6;

// 네트워크 설정 - DevNet 사용
export const SOLANA_NETWORK = 'devnet';
export const SOLANA_ENDPOINT = 'https://api.devnet.solana.com';

// ADR 토큰 민트 주소 - 테스트용 임시 주소
export const ADR_TOKEN_MINT = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
// 스테이킹 풀 주소 - 테스트용 임시 주소
export const STAKING_POOL_ADDRESS = new PublicKey('6yUy54QMKPVx8iGVid1EoqCBGizzf7JRvKEseQb4usFu');

// 로그 메시지: 테스트용 주소 사용
console.log('테스트용 토큰 민트 및 스테이킹 풀 주소를 사용합니다. 실제 배포 시 변경 필요.');

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
    // 스테이킹 트랜잭션 생성
    const transaction = await createStakingTransaction(
      connection,
      userPublicKey,
      STAKING_POOL_ADDRESS,
      amount
    );
    
    // 트랜잭션 서명 및 전송
    return await signAndSendTransaction(transaction);
  } catch (error) {
    console.error('토큰 스테이킹 중 오류 발생:', error);
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
export async function createStakingTransaction(
  connection: Connection,
  userPublicKey: PublicKey,
  stakingPoolAddress: PublicKey,
  amount: number
): Promise<Transaction> {
  try {
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
    
    // 스테이킹 풀의 토큰 계정 주소 가져오기
    const stakingVaultAddress = await getAssociatedTokenAddress(
      ADR_TOKEN_MINT,
      stakingPoolAddress,
      true, // allowOwnerOffCurve = true for PDA
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // 스테이킹 명령 데이터 생성
    const data = Buffer.from([0, ...new Uint8Array((new TextEncoder().encode(amount.toString())))]);
    
    // 스테이킹 명령 생성
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: userPublicKey, isSigner: true, isWritable: true },
        { pubkey: stakingPoolAddress, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: stakingVaultAddress, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data,
    });
    
    // 트랜잭션 객체 생성
    const transaction = new Transaction();
    transaction.add(instruction);
    
    // 최근 블록해시 가져오기
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;
    
    return transaction;
  } catch (error) {
    console.error('스테이킹 트랜잭션 생성 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 차감(Deduct) 트랜잭션 생성 함수 - 업그레이드 기능에 사용
 * @param {Connection} connection - Solana 연결 객체
 * @param {PublicKey} userPublicKey - 사용자의 공개키
 * @param {PublicKey} adminPublicKey - 관리자의 공개키
 * @param {number} amount - 차감할 토큰 양
 * @returns {Promise<Transaction>} - 트랜잭션 객체
 */
export async function createDeductTransaction(
  connection: Connection,
  userPublicKey: PublicKey,
  adminPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  try {
    // 금액을 lamports로 변환
    const amountLamports = Math.floor(amount * Math.pow(10, DECIMALS));
    
    // 사용자의 스테이커 정보 계정 주소 계산
    const [stakerInfoAddress] = await PublicKey.findProgramAddress(
      [userPublicKey.toBuffer(), STAKING_POOL_ADDRESS.toBuffer()],
      PROGRAM_ID
    );
    
    // 토큰 민트 계정 주소
    const tokenMint = ADR_TOKEN_MINT;
    
    // 스테이킹 풀의 토큰 계정 주소 가져오기
    const stakingVaultAddress = await getAssociatedTokenAddress(
      tokenMint,
      STAKING_POOL_ADDRESS,
      true, // allowOwnerOffCurve = true for PDA
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // 관리자의 토큰 계정 주소 가져오기
    const adminTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      adminPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // 차감 명령 데이터 생성
    const data = Buffer.from([3, ...new Uint8Array((new TextEncoder().encode(amount.toString())))]);
    
    // 차감 명령 생성
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: stakerInfoAddress, isSigner: false, isWritable: true },
        { pubkey: STAKING_POOL_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: stakingVaultAddress, isSigner: false, isWritable: true },
        { pubkey: adminTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userPublicKey, isSigner: false, isWritable: false },
        { pubkey: adminPublicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data,
    });
    
    // 트랜잭션 객체 생성
    const transaction = new Transaction();
    
    // 관리자의 토큰 계정이 존재하는지 확인하고 없으면 생성
    try {
      await getAccount(connection, adminTokenAccount);
    } catch (error: any) {
      if (error.name === 'TokenAccountNotFoundError') {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            adminPublicKey,
            adminTokenAccount,
            adminPublicKey,
            tokenMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      } else {
        throw error;
      }
    }
    
    transaction.add(instruction);
    
    // 최근 블록해시 가져오기
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminPublicKey;
    
    return transaction;
  } catch (error) {
    console.error('차감 트랜잭션 생성 중 오류 발생:', error);
    throw error;
  }
}

/**
 * Solana 연결 객체 생성 함수
 * @param {string} network - 네트워크 (mainnet-beta, testnet, devnet)
 * @returns {Connection} - Solana 연결 객체
 */
export function getConnection(network: string = SOLANA_NETWORK): Connection {
  let endpoint;
  
  switch (network) {
    case 'mainnet-beta':
      endpoint = 'https://api.mainnet-beta.solana.com';
      break;
    case 'testnet':
      endpoint = 'https://api.testnet.solana.com';
      break;
    case 'devnet':
    default:
      endpoint = SOLANA_ENDPOINT;
      break;
  }
  
  return new Connection(endpoint, 'confirmed');
}
