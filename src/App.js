import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import ContractA from "./artifacts/contracts/ContractA.json"; // Adjust the path accordingly
import "./App.css"; // Import the CSS file

const contractAddress = "0xa0A708b0484F4080dcD31CEb2E6557e01cB4607f";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [currentValue, setCurrentValue] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [boocheck, setboocheck] = useState(false);

  // BSC Testnet chain ID
  const BSC_TESTNET_CHAIN_ID = "0x61"; // 97 in decimal

  useEffect(() => {
    if (boocheck) {
      getValue();
    }
    if (provider && signer) {
      setboocheck(true);
      const contractInstance = new ethers.Contract(
        contractAddress,
        ContractA,
        signer
      );
      setContract(contractInstance);
    }
  }, [provider, signer]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        await window.ethereum.request({ method: "eth_requestAccounts" });

        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = web3Provider.getSigner();

        // Set provider and signer
        setProvider(web3Provider);
        setSigner(signer);

        // Check if the network is BSC Testnet
        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== parseInt(BSC_TESTNET_CHAIN_ID, 16)) {
          try {
            // Switch to BSC Testnet
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: BSC_TESTNET_CHAIN_ID }],
            });
          } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: BSC_TESTNET_CHAIN_ID,
                      chainName: "Binance Smart Chain Testnet",
                      rpcUrls: [
                        "https://data-seed-prebsc-1-s1.binance.org:8545/",
                      ],
                      nativeCurrency: {
                        name: "Binance Coin",
                        symbol: "BNB",
                        decimals: 18,
                      },
                      blockExplorerUrls: ["https://testnet.bscscan.com/"],
                    },
                  ],
                });
              } catch (addError) {
                console.error("Failed to add BSC Testnet:", addError);
              }
            }
          }
        }
      } catch (error) {
        console.error("User denied account access or error occurred:", error);
      }
    } else {
      console.error(
        "MetaMask is not installed. Please install it to use this app."
      );
    }
  };

  const getValue = async () => {
    if (contract) {
      // Manually encode the function signature "getValue()"
      const functionSignature = "getValue()";
      const encodedData = ethers.utils.id(functionSignature).slice(0, 10);
      console.log(encodedData);
      // Call the contract with the encoded data
      const value = await contract.provider.call({
        to: contractAddress,
        data: encodedData,
      });
      console.log(value);
      // Decode the returned data
      const decodedValue = ethers.BigNumber.from(value).toString();

      setCurrentValue(decodedValue);
    }
  };

  const setValue = async () => {
    if (contract) {
      // Manually encode the function signature "setValue(uint256)" and the input value
      const functionSignature = "setValue(uint256)";
      const encodedData = ethers.utils.defaultAbiCoder.encode(
        ["uint256"],
        [inputValue]
      );

      // Combine the function selector and the encoded parameters
      const data =
        ethers.utils.id(functionSignature).slice(0, 10) + encodedData.slice(2);
      console.log(data);

      // Send a transaction to the contract with the encoded data
      const tx = await contract.signer.sendTransaction({
        to: contractAddress,
        data: data,
      });

      await tx.wait();
      getValue(); // Refresh value
    }
  };

  const upgradeContract = async () => {
    try {
      // Set up provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Load the contract
      const diamondCut = new ethers.Contract(
        contractAddress,
        [
          "function diamondCut(tuple(address facetAddress, uint8 action, bytes4[] functionSelectors)[] _cut, address _init, bytes _calldata) external",
        ],
        signer
      );

      // Create the cut object
      let cut = [
        {
          facetAddress: "0x5729698F1a4B1DDEA9dB9B3b067656fDa82701BA",
          action: 0,
          functionSelectors: [
            "0x70480275",
            "0x41858c4b",
            "0x8204c326",
            "0x24d7806c",
            "0x1785f53c",
            "0x83b8a5ae",
            "0xada8f919",
          ],
        },
      ];

      // Encode the init function data
      const diamondInit = new ethers.Contract(
        "0x624abf031fe8B5a8c49C4cC0AC1317710273Af0A",
        ["function init() external"],
        signer
      );
      const functionCall = diamondInit.interface.encodeFunctionData("init");

      // Call the diamondCut function
      const tx = await diamondCut.diamondCut(
        cut,
        "0x624abf031fe8B5a8c49C4cC0AC1317710273Af0A",
        functionCall
      );
      console.log("Diamond cut tx: ", tx.hash);

      await tx.wait();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Diamond Contracts DApp</h1>
        <button onClick={connectWallet}>Connect Wallet</button>
        <div>
          <h2>Current Value: {currentValue}</h2>
          <button onClick={getValue}>Get Value</button>
        </div>
        <div>
          <input
            type="number"
            placeholder="Set Value"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button onClick={setValue}>Set Value</button>
        </div>
        <div>
          <button onClick={upgradeContract}>Upgrade Contract</button>
        </div>
      </header>
    </div>
  );
}

export default App;
