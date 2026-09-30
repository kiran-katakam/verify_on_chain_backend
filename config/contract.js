import { ethers } from "ethers";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ABI from compiled contract artifacts
const abiPath = join(
    __dirname,
    "./VerifyOnChain.json"
);

let contractABI;
try {
    const artifact = JSON.parse(readFileSync(abiPath, "utf8"));
    contractABI = artifact.abi;
} catch (err) {
    console.warn("⚠️  Contract ABI not found. Run 'npx hardhat compile' in /contracts first.");
    contractABI = [];
}

// Read-only provider + contract instance
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");

/**
 * Get a read-only contract instance.
 */
export function getContract() {
    const address = process.env.CONTRACT_ADDRESS;
    if (!address) throw new Error("CONTRACT_ADDRESS not set in .env");
    return new ethers.Contract(address, contractABI, provider);
}

/**
 * Verify a certificate by its field hash directly on-chain.
 */
export async function verifyCertificateByHash(fieldHash) {
    const contract = getContract();
    const [issuer, timestamp, isValid, exists] =
        await contract.verifyCertificate(fieldHash);

    return {
        issuer,
        timestamp: Number(timestamp),
        isValid,
        exists,
    };
}

/**
 * Compute the keccak256 hash of certificate fields in the canonical order.
 *
 * Schema: firstName, lastName, dob, studentId, percentile, issuerAddress
 */
export function computeFieldHash(fields, issuerAddress) {
    return ethers.solidityPackedKeccak256(
        ["string", "string", "string", "string", "uint256", "address"],
        [
            fields.firstName,
            fields.lastName,
            fields.dob,
            fields.studentId,
            Number(fields.percentile),
            issuerAddress,
        ]
    );
}

export { contractABI, provider };
