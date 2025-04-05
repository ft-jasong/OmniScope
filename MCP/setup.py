"""
Setup script for HashScope MCP package.
"""

from setuptools import setup, find_packages

setup(
    name="hashscope-mcp",
    version="0.1.0",
    description="HashScope API integration with LangChain",
    author="HashScope Team",
    author_email="info@hashscope.io",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
        "langchain>=0.0.267",
        "pydantic>=2.0.0",
    ],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
    python_requires=">=3.8",
)
