import React, { useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useDispatch, useSelector } from 'react-redux';
import { connectWallet, disconnectWallet } from '../../redux/walletSlice';
import { Box, Typography, Button } from '@mui/material';

const SolanaWalletButton = () => {
  const { publicKey, wallet, connected, disconnect, select, connect } = useWallet();
  const dispatch = useDispatch();
  const walletState = useSelector(state => state.wallet);

  // Update Redux state when wallet connection changes
  useEffect(() => {
    if (connected && publicKey) {
      dispatch(connectWallet({
        publicKey: publicKey.toString(),
        adapter: wallet?.adapter?.name || 'Unknown'
      }));
      console.log('Wallet connected:', publicKey.toString());
    } else if (connected === false) { // Explicitly check for false to avoid undefined
      dispatch(disconnectWallet());
      console.log('Wallet disconnected');
    }
  }, [connected, publicKey, wallet, dispatch]);

  // Handle manual connection to wallet
  const handleConnect = useCallback(async () => {
    try {
      if (wallet) {
        await connect();
        console.log('Connection initiated');
      } else {
        console.log('No wallet selected');
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, [wallet, connect]);

  // Handle disconnect with confirmation
  const handleDisconnect = useCallback(async () => {
    if (connected) {
      await disconnect();
      dispatch(disconnectWallet());
      console.log('Disconnected');
    }
  }, [connected, disconnect, dispatch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <WalletMultiButton />
      
      {connected && publicKey ? (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography variant="body2" color="success.main" gutterBottom>
            Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </Typography>
          <Button 
            variant="outlined" 
            color="error" 
            size="small"
            onClick={handleDisconnect}
            sx={{ mt: 1 }}
          >
            Disconnect
          </Button>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Not connected
        </Typography>
      )}
    </Box>
  );
};

export default SolanaWalletButton;
