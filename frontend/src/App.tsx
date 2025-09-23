// App.tsx
// Main React component for the Farcaster + Arbitrum Mini-App Starter.
// This file demonstrates wallet connection, NFT minting, and NFT gallery display using event-based discovery.
// Use this as a template for your own Farcaster miniapp frontend.

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk"; // Farcaster MiniApp SDK for social sharing
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi"; // Wagmi hooks for EVM wallet and contract interaction
import SampleNFTAbi from "./abi/SampleNFT.json"; // Minimal ERC721 ABI with Transfer event

// Address of the deployed Stylus (Arbitrum) NFT contract
// Update this after deploying your own contract
const CONTRACT_ADDRESS = "0xdb3f4ecb0298238a19ec5afd087c6d9df8041919";

import { useState } from "react";
import { publicClient } from "./hooks/usePublicClient"; // viem public client for low-level RPC

export default function App() {
  // Wagmi hooks for wallet connection and contract interaction
  const { isConnected, address } = useAccount();
  const { connect, connectors, error, status } = useConnect();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isMinted } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const [nfts, setNfts] = useState<{ tokenId: string; image: string; name: string; description: string }[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);

  useEffect(() => {
    sdk.actions.ready(); // Farcaster Mini-App SDK ready
  }, []);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!isConnected || !address) return;
      setLoadingNfts(true);
      try {
        // Find the Transfer event ABI
        const transferEvent = SampleNFTAbi.find(
          (e: any) => e.type === "event" && e.name === "Transfer"
        ) as any;
        if (!transferEvent) {
          setNfts([]);
          setLoadingNfts(false);
          return;
        }
        // Fetch all Transfer logs
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: transferEvent,
          fromBlock: 0n,
          toBlock: 'latest',
        });
        // Filter for tokens minted to this user
        const tokenIds = logs
          .filter((log: any) => log.args && log.args.to && log.args.to.toLowerCase() === address.toLowerCase())
          .map((log: any) => log.args.tokenId as bigint);
        if (tokenIds.length === 0) {
          setNfts([]);
          setLoadingNfts(false);
          return;
        }
        // Get tokenURI for each tokenId
        const tokens = await Promise.all(tokenIds.map(async (tokenId: bigint) => {
          try {
            const tokenUri = await publicClient.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: SampleNFTAbi,
              functionName: 'tokenURI',
              args: [tokenId]
            });
            // Debug: Log the raw tokenUri
            console.log('Raw tokenURI for tokenId', tokenId.toString(), ':', tokenUri);
            let meta = { image: '', name: '', description: '' };
            if (typeof tokenUri === 'string') {
              try {
                meta = JSON.parse(tokenUri);
              } catch (e) {
                console.error('JSON parse error for tokenURI:', e, tokenUri);
              }
            }
            return { tokenId: tokenId.toString(), ...meta };
          } catch {
            return { tokenId: tokenId.toString(), image: '', name: '', description: '' };
          }
        }));
        // Debug: Log the fetched tokens array
        console.log('Fetched tokens:', tokens);
        setNfts(tokens);
      } catch (err) {
        setNfts([]);
      }
      setLoadingNfts(false);
    };
    if (isConnected && address) {
      fetchNFTs();
    }
  }, [isConnected, address, isMinted]);

  // Example mint handler for Stylus NFT contract
  const handleMint = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: SampleNFTAbi,
      functionName: "mint", // TODO: Update if your contract uses a different function
      value: BigInt(0), // TODO: Set value if mint is payable
    });
  };

  // Example Farcaster share handler
  const handleShare = () => {
    sdk.actions.composeCast({
      text: `I just used the Farcaster + Arbitrum mini-app starter!`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-cyan-900 text-white p-6">
      <main className="w-full max-w-md bg-slate-950/90 rounded-2xl shadow-xl p-8 flex flex-col items-center border border-cyan-400/10">
        <h1 className="text-3xl font-bold mb-6 text-cyan-200">Farcaster + Arbitrum Mini-App Starter</h1>
        {!isConnected ? (
          <button
            className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
            disabled={status === 'pending' || !connectors.length}
            onClick={() => connect({ connector: connectors[0] })}
          >
            {status === 'pending' ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="mb-2 text-cyan-100 text-sm w-full flex flex-col items-center">
  <span className="block w-full truncate font-mono bg-slate-900/70 rounded px-2 py-1 text-cyan-200 text-xs border border-cyan-800/40" title={address} style={{maxWidth:'100%'}}>Connected: {address}</span>
</div>
            <button
              className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold w-full"
              onClick={handleMint}
              disabled={isPending || isConfirming || isMinted}
            >
              {isPending ? 'Minting...' : isConfirming ? 'Confirming...' : isMinted ? 'NFT Minted!' : 'Mint NFT'}
            </button>
            <button
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold w-full"
              onClick={handleShare}
            >
              Share to Farcaster
            </button>
          </div>
        )}
        {error && <div className="text-red-400 font-semibold text-sm mt-2">{error.message}</div>}

        {/* NFT Gallery */}
        {isConnected && (
          <div className="w-full mt-6">
            {loadingNfts ? (
              <div className="text-cyan-300 text-center">Loading your NFTs...</div>
            ) : nfts.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold mb-2 text-cyan-100 text-center">Your Minted NFTs</h2>
                <div className="flex flex-col gap-4">
                  {nfts.map(nft => (
                    <div key={nft.tokenId} className="bg-slate-800 rounded-xl p-4 flex flex-col items-center border border-cyan-800/30">
                      <pre className="text-xs text-cyan-300 bg-slate-900 rounded p-2 mb-2 w-full overflow-x-auto">{JSON.stringify(nft, null, 2)}</pre>
                      {nft.image && (
                        <img src={nft.image} alt={nft.name} className="w-32 h-32 object-contain mb-2 rounded-lg border border-cyan-500/40" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                      )}
                      <div className="font-bold text-cyan-200">{nft.name || `Token #${nft.tokenId}`}</div>
                      <div className="text-cyan-100 text-xs mt-1 text-center">{nft.description}</div>
                      <div className="text-cyan-400 text-xs mt-1 font-mono">Token ID: {nft.tokenId}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-cyan-300 text-center">You haven't minted any NFTs yet.</div>
            )}
          </div>
        )}
      </main>
      <footer className="w-full fixed bottom-0 left-0 bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-t border-slate-800 flex flex-col items-center py-2 z-50">
        <img src="/arbitrum.png" alt="Arbitrum Logo" className="h-6 mb-1" />
        <div className="text-xs text-slate-400 mt-1">
          Made with <span className="text-red-500">❤️</span> by the
          <a
            href="https://arbitrum.foundation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline ml-1 font-medium"
          >
            Arbitrum DevRel Team
          </a>
        </div>
      </footer>
    </div>
  );
}
