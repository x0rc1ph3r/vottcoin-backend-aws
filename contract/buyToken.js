/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenv from "dotenv";
dotenv.config();
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction
} from "@solana/web3.js";
import { connection } from '../utils/helper.js';
import { createAccountInfo, checkAccountInitialized } from "./utils.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, getAccount, createAssociatedTokenAccountInstruction, TokenInvalidAccountOwnerError, TokenAccountNotFoundError } from "@solana/spl-token";
import { TokenSaleAccountLayout } from "./account.js";
import BN from "bn.js";


export default async function transaction(buyerPubkey, number_of_tokens) {
  console.log("3. Buy Tokens");
  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Buy Transaction");
  const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID);

  const tokenPubkey = new PublicKey(process.env.TOKEN_PUBKEY);
  const tokenSaleProgramAccountPubkey = new PublicKey(process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY);
  const instruction = 1;

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

  const buyerTokenAccount = getAssociatedTokenAddressSync(tokenPubkey, new PublicKey(buyerPubkey));

  const PDA = await PublicKey.findProgramAddress([Buffer.from("token_sale")], tokenSaleProgramId);

  const {
    context: { slot: minContextSlot },
    value: { blockhash, lastValidBlockHeight },
  } = await connection.getLatestBlockhashAndContext();

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: new PublicKey(buyerPubkey),
  });

  try {
    await getAccount(connection, buyerTokenAccount);
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
      const createATAInstruction = createAssociatedTokenAccountInstruction(
        new PublicKey(buyerPubkey),
        buyerTokenAccount,
        new PublicKey(buyerPubkey),
        tokenPubkey
      );
      tx.add(createATAInstruction);
    } else {
      throw error;
    }
  }

  const buyTokenIx = new TransactionInstruction({
    programId: tokenSaleProgramId,
    keys: [
      createAccountInfo(new PublicKey(buyerPubkey), true, true),
      createAccountInfo(tokenSaleProgramAccountData.sellerPubkey, false, true),
      createAccountInfo(tokenSaleProgramAccountData.tempTokenAccountPubkey, false, true),
      createAccountInfo(tokenSaleProgramAccountPubkey, false, false),
      createAccountInfo(SystemProgram.programId, false, false),
      createAccountInfo(buyerTokenAccount, false, true),
      createAccountInfo(TOKEN_PROGRAM_ID, false, false),
      createAccountInfo(tokenPubkey, false, false),
      createAccountInfo(PDA[0], false, false),
    ],
    data: Buffer.from(Uint8Array.of(instruction, ...new BN(number_of_tokens).toArray("le", 8))),
  });

  tx.add(buyTokenIx);

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

  // await connection.sendTransaction(tx, [buyerKeypair], {
  //   skipPreflight: false,
  //   preflightCommitment: "confirmed",
  // });
  //phase1 end
};
