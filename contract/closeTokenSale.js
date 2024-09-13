/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenv from "dotenv";
dotenv.config();
import {
  PublicKey,
  TransactionInstruction,
  Transaction
} from "@solana/web3.js";
import { connection } from '../utils/helper.js';
import { createAccountInfo, checkAccountInitialized } from "./utils.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenSaleAccountLayout } from "./account.js";


export default async function transaction() {
  console.log("4. Close Token Sale");

  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Transaction");
  const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID);
  const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY);

  const tokenSaleProgramAccountPubkey = new PublicKey(process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY);
  const sellerTokenAccountPubkey = new PublicKey(process.env.SELLER_TOKEN_ACCOUNT_PUBKEY);
  const instruction = 2;

  const tokenSaleProgramAccount = await checkAccountInitialized(connection, tokenSaleProgramAccountPubkey);
  const encodedTokenSaleProgramAccountData = tokenSaleProgramAccount.data;
  const decodedTokenSaleProgramAccountData = TokenSaleAccountLayout.decode(
    encodedTokenSaleProgramAccountData
  );
  const tokenSaleProgramAccountData = {
    isInitialized: decodedTokenSaleProgramAccountData.isInitialized,
    sellerPubkey: new PublicKey(decodedTokenSaleProgramAccountData.sellerPubkey),
    tempTokenAccountPubkey: new PublicKey(decodedTokenSaleProgramAccountData.tempTokenAccountPubkey),
    swapSolAmount: decodedTokenSaleProgramAccountData.swapSolAmount,
    swapTokenAmount: decodedTokenSaleProgramAccountData.swapTokenAmount,
  };
  const PDA = await PublicKey.findProgramAddress([Buffer.from("token_sale")], tokenSaleProgramId);

  const closeTokenSaleIx = new TransactionInstruction({
    programId: tokenSaleProgramId,
    keys: [
      createAccountInfo(sellerPubkey, true, true),
      createAccountInfo(sellerTokenAccountPubkey, false, true),
      createAccountInfo(tokenSaleProgramAccountData.tempTokenAccountPubkey, false, true),
      createAccountInfo(TOKEN_PROGRAM_ID, false, false),
      createAccountInfo(PDA[0], false, false),
      createAccountInfo(tokenSaleProgramAccountPubkey, false, true),
    ],
    data: Buffer.from(Uint8Array.of(instruction)),
  });

  // await connection.sendTransaction(tx, [sellerKeypair], {
  //   skipPreflight: false,
  //   preflightCommitment: "confirmed",
  // });

  
  const {
    context: { slot: minContextSlot },
    value: { blockhash, lastValidBlockHeight },
  } = await connection.getLatestBlockhashAndContext();

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: sellerPubkey,
  });
  tx.add(closeTokenSaleIx);

  const serializedTransaction = tx.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });

  const base64Transaction = serializedTransaction.toString('base64');

  return {
    base64Transaction,
    minContextSlot,
    blockhash,
    lastValidBlockHeight,
    message: "OK",
  };
};
