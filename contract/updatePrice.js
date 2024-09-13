/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenv from "dotenv";
dotenv.config();
import { connection } from '../utils/helper.js';

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
  Transaction
} from "@solana/web3.js";
import BN from "bn.js";
import { checkAccountInitialized, checkAccountDataIsValid, createAccountInfo } from "./utils.js";

import { TokenSaleAccountLayout } from "./account.js";

export default async function transaction(new_per_token_price) {
  console.log("Update Token price");

  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Transaction");
  const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID);
  const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY);
  const sellerTokenAccountPubkey = new PublicKey(process.env.SELLER_TOKEN_ACCOUNT_PUBKEY);
  const tokenSaleProgramAccountPubkey = new PublicKey(process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY);
  const tempTokenAccountPubkey = new PublicKey(process.env.TEMP_TOKEN_ACCOUNT_PUBKEY);
  console.log("sellerTokenAccountPubkey: ", sellerTokenAccountPubkey.toBase58());
  const instruction = 3;

  const newPerTokenPrice = new_per_token_price * LAMPORTS_PER_SOL;

  const {
    context: { slot: minContextSlot },
    value: { blockhash, lastValidBlockHeight },
  } = await connection.getLatestBlockhashAndContext();

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: sellerPubkey,
  });

  const updateTokenPriceIx = new TransactionInstruction({
    programId: tokenSaleProgramId,
    keys: [
      createAccountInfo(sellerPubkey, true, false),
      createAccountInfo(tokenSaleProgramAccountPubkey, false, true),
    ],
    data: Buffer.from(Uint8Array.of(instruction, ...new BN(newPerTokenPrice).toArray("le", 8))),
  });

  tx.add(updateTokenPriceIx);

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

  //make transaction with several instructions(ix)
  console.log("Send transaction...\n");
  // const tx = new Transaction().add(updateTokenPriceIx);

  // await connection.sendTransaction(tx, [sellerKeypair], {
  //   skipPreflight: false,
  //   preflightCommitment: "confirmed",
  // });
  //phase1 end

  //wait block update
  await new Promise((resolve) => setTimeout(resolve, 2000));

  //phase2 (check Transaction result is valid)
  const tokenSaleProgramAccount = await checkAccountInitialized(connection, tokenSaleProgramAccountPubkey);

  const encodedTokenSaleProgramAccountData = tokenSaleProgramAccount.data;
  const decodedTokenSaleProgramAccountData = TokenSaleAccountLayout.decode(
    encodedTokenSaleProgramAccountData
  );

  const expectedTokenSaleProgramAccountData = {
    isInitialized: 1,
    sellerPubkey: sellerPubkey,
    tempTokenAccountPubkey: tempTokenAccountPubkey,
    pricePerToken: newPerTokenPrice,
  };

  console.log("Current TokenSaleProgramAccountData");
  checkAccountDataIsValid(decodedTokenSaleProgramAccountData, expectedTokenSaleProgramAccountData);

  console.table([
    {
      pricePerToken: newPerTokenPrice / LAMPORTS_PER_SOL + " SOL",
    },
  ]);
  console.log(`✨TX successfully finished✨\n`);
  //#phase2 end

};
