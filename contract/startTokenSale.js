/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenv from "dotenv";
dotenv.config();
import { connection } from '../utils/helper.js';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { checkAccountInitialized, checkAccountDataIsValid, createAccountInfo, updateEnv } from "./utils.js";

import { TokenSaleAccountLayout } from "./account.js";
import { AccountLayout, createInitializeAccountInstruction, createTransferInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export default async function transaction(price, nooftokens) {
  console.log("2. Start Token Sale");

  //phase1 (setup Transaction & send Transaction)
  console.log("Setup Transaction");
  const tokenSaleProgramId = new PublicKey(process.env.CUSTOM_PROGRAM_ID);
  const sellerPubkey = new PublicKey(process.env.SELLER_PUBLIC_KEY);
  const tokenMintAccountPubkey = new PublicKey(process.env.TOKEN_PUBKEY);
  const sellerTokenAccountPubkey = getAssociatedTokenAddressSync(tokenMintAccountPubkey, sellerPubkey);

  console.log("sellerTokenAccountPubkey: ", sellerTokenAccountPubkey.toBase58());
  const instruction = 0;
  const sellerTokenBalance = await connection.getTokenAccountBalance(sellerTokenAccountPubkey, "confirmed");
  const NUMBER_OF_DECIMALS = sellerTokenBalance.value.decimals;
  const amountOfTokenWantToSale = nooftokens;
  const perTokenPrice = price * LAMPORTS_PER_SOL;

  const tempTokenAccountKeypair = new Keypair();
  const createTempTokenAccountIx = SystemProgram.createAccount({
    fromPubkey: sellerPubkey,
    newAccountPubkey: tempTokenAccountKeypair.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(AccountLayout.span),
    space: AccountLayout.span,
    programId: TOKEN_PROGRAM_ID,
  });

  const initTempTokenAccountIx = createInitializeAccountInstruction(
    tempTokenAccountKeypair.publicKey,
    tokenMintAccountPubkey,
    sellerPubkey
  );

  const transferTokenToTempTokenAccountIx = createTransferInstruction(
    sellerTokenAccountPubkey,
    tempTokenAccountKeypair.publicKey,
    sellerPubkey,
    amountOfTokenWantToSale * 10 ** NUMBER_OF_DECIMALS
  );

  const tokenSaleProgramAccountKeypair = new Keypair();
  const createTokenSaleProgramAccountIx = SystemProgram.createAccount({
    fromPubkey: sellerPubkey,
    newAccountPubkey: tokenSaleProgramAccountKeypair.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(TokenSaleAccountLayout.span),
    space: TokenSaleAccountLayout.span,
    programId: tokenSaleProgramId,
  });

  const initTokenSaleProgramIx = new TransactionInstruction({
    programId: tokenSaleProgramId,
    keys: [
      createAccountInfo(sellerPubkey, true, false),
      createAccountInfo(tempTokenAccountKeypair.publicKey, false, true),
      createAccountInfo(tokenSaleProgramAccountKeypair.publicKey, false, true),
      createAccountInfo(SYSVAR_RENT_PUBKEY, false, false),
      createAccountInfo(TOKEN_PROGRAM_ID, false, false),
    ],
    data: Buffer.from(Uint8Array.of(instruction, ...new BN(perTokenPrice).toArray("le", 8))),
  });

  //make transaction with several instructions(ix)
  console.log("Send transaction...\n");
  const {
    context: { slot: minContextSlot },
    value: { blockhash, lastValidBlockHeight },
  } = await connection.getLatestBlockhashAndContext();

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: sellerPubkey,
  });
  tx.add(
    createTempTokenAccountIx,
    initTempTokenAccountIx,
    transferTokenToTempTokenAccountIx,
    createTokenSaleProgramAccountIx,
    initTokenSaleProgramIx
  );

  tx.partialSign(tempTokenAccountKeypair);
  tx.partialSign(tokenSaleProgramAccountKeypair);

  const serializedTransaction = tx.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });

  const base64Transaction = serializedTransaction.toString('base64');

  process.env.SELLER_TOKEN_ACCOUNT_PUBKEY = sellerTokenAccountPubkey.toString();
  process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY = tokenSaleProgramAccountKeypair.publicKey.toString();
  process.env.TEMP_TOKEN_ACCOUNT_PUBKEY = tempTokenAccountKeypair.publicKey.toString();
  updateEnv();

  console.log("SELLER_TOKEN_ACCOUNT_PUBKEY: ", sellerTokenAccountPubkey.toString());
  console.log("TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY: ", tokenSaleProgramAccountKeypair.publicKey.toString());
  console.log("TEMP_TOKEN_ACCOUNT_PUBKEY: ", tempTokenAccountKeypair.publicKey.toString());
  return {
    base64Transaction,
    minContextSlot,
    blockhash,
    lastValidBlockHeight,
    message: "OK",
  };

  // await connection.sendTransaction(tx, [sellerKeypair, tempTokenAccountKeypair, tokenSaleProgramAccountKeypair], {
  //   skipPreflight: false,
  //   preflightCommitment: "confirmed",
  // });
  //phase1 end

  //wait block update
  await new Promise((resolve) => setTimeout(resolve, 2000));

  //phase2 (check Transaction result is valid)
  const tokenSaleProgramAccount = await checkAccountInitialized(connection, tokenSaleProgramAccountKeypair.publicKey);

  const encodedTokenSaleProgramAccountData = tokenSaleProgramAccount.data;
  const decodedTokenSaleProgramAccountData = TokenSaleAccountLayout.decode(
    encodedTokenSaleProgramAccountData
  );

  const expectedTokenSaleProgramAccountData = {
    isInitialized: 1,
    sellerPubkey: sellerPubkey,
    tempTokenAccountPubkey: tempTokenAccountKeypair.publicKey,
    pricePerToken: perTokenPrice,
  };

  console.log("Current TokenSaleProgramAccountData");
  checkAccountDataIsValid(decodedTokenSaleProgramAccountData, expectedTokenSaleProgramAccountData);

  console.table([
    {
      tokenSaleProgramAccountPubkey: tokenSaleProgramAccountKeypair.publicKey.toString(),
    },
  ]);
  console.log(`✨TX successfully finished✨\n`);
  //#phase2 end

  process.env.SELLER_TOKEN_ACCOUNT_PUBKEY = sellerTokenAccountPubkey.toString();
  process.env.TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY = tokenSaleProgramAccountKeypair.publicKey.toString();
  process.env.TEMP_TOKEN_ACCOUNT_PUBKEY = tempTokenAccountKeypair.publicKey.toString();
  updateEnv();
};
