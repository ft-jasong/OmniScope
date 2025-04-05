"""
Setup script for OmniScope MCP package.
"""

from setuptools import setup, find_packages

setup(
    name="omniscope-mcp",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "langchain>=0.0.267",
        "langchain-core>=0.0.10",
        "langchain-community>=0.0.1",
        "requests>=2.28.0",
        "python-dotenv>=0.21.0",
        "openai>=0.27.0",
        "pydantic>=1.10.0",
    ],
    author="OmniScope Team",
    author_email="contact@omniscope.ai",
    description="OmniScope Model Context Protocol - LangChain Tool Integration",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/ft-jasong/OmniScope",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
