import React, { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setPaymentPending, 
  setPaymentSuccess, 
  setPaymentError 
} from '../../redux/walletSlice';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  Alert, 
  Paper 
} from '@mui/material';
import SolanaWalletButton from './SolanaWalletButton';

const SolanaPayment = ({ amount, onSuccess, onError }) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const dispatch = useDispatch();
  const { paymentStatus, paymentError, paymentTxId } = useSelector(state => state.wallet);
  const [isProcessing, setIsProcessing] = useState(false);

  // Convert amount to SOL (fixed at 0.001 SOL for demo)
  const solAmount = amount;
  
  // Recipient wallet address (your business wallet) - this is just a demo wallet, replace with your actual wallet
  // Using a well-known Solana dev wallet to ensure it exists on devnet
  const RECIPIENT_WALLET = "9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g";

  // Check wallet balance
  const [balance, setBalance] = useState(null);

  const fetchBalance = useCallback(async () => {
    if (publicKey && connection) {
      try {
        const lamports = await connection.getBalance(publicKey);
        setBalance(lamports / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(null);
      }
    } else {
      setBalance(null);
    }
  }, [publicKey, connection]);

  // Update balance when wallet connection changes
  useEffect(() => {
    fetchBalance();
    // Set up polling for balance updates
    const interval = setInterval(fetchBalance, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [fetchBalance, publicKey]);

  const handlePayment = async () => {
    if (!publicKey) {
      dispatch(setPaymentError("Please connect your wallet first"));
      if (onError) onError("Wallet not connected");
      return;
    }

    try {
      console.log('Starting payment process...');
      setIsProcessing(true);
      dispatch(setPaymentPending());

      // Check balance first
      const currentBalance = await connection.getBalance(publicKey);
      // Convert to integer before using in calculations to avoid BigInt conversion errors
      const requiredLamports = Math.round(solAmount * LAMPORTS_PER_SOL);
      
      console.log(`Current balance: ${currentBalance / LAMPORTS_PER_SOL} SOL`);
      console.log(`Required amount: ${solAmount} SOL`);
      console.log(`Required lamports: ${requiredLamports}`);

      if (currentBalance < requiredLamports) {
        throw new Error(`Insufficient balance. You need at least ${solAmount} SOL.`);
      }

      // Create a new transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(RECIPIENT_WALLET),
          lamports: requiredLamports // This is now guaranteed to be an integer
        })
      );

      // Get the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('Sending transaction...');
      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent with signature:', signature);
      
      // Wait for confirmation
      console.log('Waiting for confirmation...');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      console.log('Confirmation received:', confirmation);
      
      if (confirmation.value && confirmation.value.err) {
        throw new Error("Transaction failed: " + JSON.stringify(confirmation.value.err));
      }

      // Success
      console.log('Payment successful!');
      dispatch(setPaymentSuccess(signature));
      if (onSuccess) onSuccess(signature);
    } catch (error) {
      console.error("Payment error:", error);
      dispatch(setPaymentError(error.message || "Payment failed"));
      if (onError) onError(error.message || "Payment failed");
    } finally {
      setIsProcessing(false);
      // Refresh balance after payment attempt
      fetchBalance();
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Solana Wallet Payment
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!publicKey ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Connect your Solana wallet to pay
            </Typography>
            <SolanaWalletButton />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">
                Amount to pay: {solAmount} SOL
              </Typography>
              
              {balance !== null && (
                <Typography variant="body2" color={balance >= solAmount ? "success.main" : "error.main"}>
                  Balance: {balance.toFixed(6)} SOL
                </Typography>
              )}
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handlePayment}
              disabled={isProcessing || paymentStatus === 'pending' || !publicKey || (balance !== null && balance < solAmount)}
              sx={{ mt: 1 }}
            >
              {isProcessing || paymentStatus === 'pending' ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Processing...
                </>
              ) : (
                'Pay Now with Solana'
              )}
            </Button>
            
            {balance !== null && balance < solAmount && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Insufficient balance. You need at least {solAmount} SOL to make this payment.
              </Alert>
            )}
          </>
        )}
        
        {paymentStatus === 'success' && (
          <Alert severity="success">
            Payment successful! Transaction ID: {paymentTxId && paymentTxId.slice(0, 8)}...{paymentTxId && paymentTxId.slice(-8)}
          </Alert>
        )}
        
        {paymentStatus === 'error' && (
          <Alert severity="error">
            {paymentError || "Payment failed. Please try again."}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default SolanaPayment;
