import {
  AgentKit,
  WalletProvider,
} from "@coinbase/agentkit";
import { CdpWalletProvider } from "@coinbase/agentkit";
import * as fs from "fs";
import * as path from "path";
import { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Buffer } from "buffer";

console.log("Network ID:", process.env.NEXT_NETWORK_ID); // Should print 'base-sepolia' or your configured network
console.log("CDP API Key Name:", process.env.NEXT_CDP_API_KEY_NAME);
console.log("CDP API Private Key:", process.env.NEXT_CDP_API_KEY_PRIVATE_KEY);


/**
 * AgentKit Integration Route
 *
 * This file is your gateway to integrating AgentKit with your product.
 * It defines the core capabilities of your agent through WalletProvider
 * and ActionProvider configuration.
 *
 * Key Components:
 * 1. WalletProvider Setup:
 *    - Configures the blockchain wallet integration
 *    - Learn more: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#evm-wallet-providers
 *
 * 2. ActionProviders Setup:
 *    - Defines the specific actions your agent can perform
 *    - Choose from built-in providers or create custom ones:
 *      - Built-in: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#action-providers
 *      - Custom: https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#creating-an-action-provider
 *
 * # Next Steps:
 * - Explore the AgentKit README: https://github.com/coinbase/agentkit
 * - Experiment with different LLM configurations
 * - Fine-tune agent parameters for your use case
 *
 * ## Want to contribute?
 * Join us in shaping AgentKit! Check out the contribution guide:
 * - https://github.com/coinbase/agentkit/blob/main/CONTRIBUTING.md
 * - https://discord.gg/CDP
 */

type WalletData = {
  privateKey: Hex;
  smartWalletAddress: Address;
};

/**
 * Prepares the AgentKit and WalletProvider.
 *
 * @function prepareAgentkitAndWalletProvider
 * @returns {Promise<{ agentkit: AgentKit, walletProvider: WalletProvider }>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */

export async function prepareAgentkitAndWalletProvider(): Promise<{
  agentkit: AgentKit;
  walletProvider: WalletProvider;
}> {
  let walletData: WalletData | null = null;
    let privateKey: Hex | null = null;
    const WALLET_DATA_FILE = path.join(process.cwd(), "app", "api", "agent", "wallet_data.txt");
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        const rawData = fs.readFileSync(WALLET_DATA_FILE, "utf8");
        walletData = JSON.parse(rawData) as WalletData;
        const basePrivateKey = (walletData.privateKey) as Hex;
        const decoded = Buffer.from(basePrivateKey, "base64");
        privateKey = "0x" + decoded.toString("hex").slice(2, 66);
        
        console.log(privateKey);
      } catch (error) {
        console.error("❌ Invalid JSON format in wallet_data.txt:", error);
        process.exit(1); 
      }
    }

    if (!privateKey) {
      if (walletData?.smartWalletAddress) {
        throw new Error(
          `Smart wallet found but no private key provided. Either provide the private key, or delete ${WALLET_DATA_FILE} and try again.`,
        );
      }
      privateKey = (process.env.PRIVATE_KEY || generatePrivateKey()) as Hex;
    }
    
    const signer = privateKeyToAccount(privateKey);
    console.log("Signer:", signer);
    // Initialize WalletProvider: https://docs.cdp.coinbase.com/agentkit/docs/wallet-management
    // const walletProvider = await SmartWalletProvider.configureWithWallet({
    //   networkId: process.env.NEXT_NETWORK_ID,
    //   cdpApiKeyName: process.env.NEXT_CDP_API_KEY_NAME,
    //   cdpApiKeyPrivateKey: process.env.NEXT_CDP_API_KEY_PRIVATE_KEY,
    //   signer: signer,
    // });
    const walletProvider = await CdpWalletProvider.configureWithWallet({
      apiKeyName: process.env.NEXT_CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.NEXT_CDP_API_KEY_PRIVATE_KEY,
      networkId: process.env.NEXT_NETWORK_ID
    });
    console.log("WalletProvider:", walletProvider);

    // Initialize AgentKit: https://docs.cdp.coinbase.com/agentkit/docs/agent-actions
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [],
    });

    // Save wallet data
    const smartWalletAddress = await walletProvider.getAddress();
    console.log("Smart wallet address:", smartWalletAddress);
    fs.writeFileSync(
      WALLET_DATA_FILE,
      JSON.stringify({
        privateKey,
        smartWalletAddress,
      } as WalletData),
    );
    
    return { agentkit, walletProvider };
}
