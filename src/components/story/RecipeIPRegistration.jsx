import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  TextField,
  Modal,
  Typography,
  Select,
  MenuItem,
  Stack,
  Paper,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import { useStoryProtocol } from '../../providers/StoryProtocolProvider';
import { toast } from 'react-hot-toast';

const RecipeIPRegistration = ({ recipeData, onRegistrationComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { registerRecipeAsIP, createRecipeLicense, isInitialized } = useStoryProtocol();
  
  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const [licenseTerms, setLicenseTerms] = useState({
    licenseType: 'Attribution-NonCommercial',
    commercial: false,
    derivatives: true,
    reciprocal: true,
    royaltyAmount: 0,
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLicenseChange = (e) => {
    const { name, value, checked } = e.target;
    setLicenseTerms((prev) => ({
      ...prev,
      [name]: name === 'royaltyAmount' ? parseFloat(value) : checked,
    }));
  };

  const handleRegistration = async () => {
    if (!isInitialized) {
      toast.error('Story Protocol client is not initialized');
      return;
    }

    try {
      setIsRegistering(true);
      // Register the recipe as an IP asset
      const registrationResult = await registerRecipeAsIP(recipeData);
      
      // Create a license for the recipe
      if (registrationResult && registrationResult.ipId) {
        const licenseResult = await createRecipeLicense(
          registrationResult.ipId,
          licenseTerms
        );
        
        toast.success('Your recipe has been registered as an IP asset with Story Protocol');
        
        // Notify parent component of successful registration
        if (onRegistrationComplete) {
          onRegistrationComplete({
            ipAsset: registrationResult,
            license: licenseResult,
          });
        }
      }
    } catch (error) {
      console.error('Error registering recipe:', error);
      toast.error(error.message || 'Failed to register recipe as IP asset');
    } finally {
      setIsRegistering(false);
      handleClose();
    }
  };

  return (
    <>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleOpen} 
        startIcon={<LockIcon />}
      >
        Register Recipe as IP
      </Button>

      <Modal 
        open={isOpen} 
        onClose={handleClose}
        aria-labelledby="recipe-ip-registration-modal"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography id="recipe-ip-registration-modal" variant="h6" component="h2">
              Register Recipe as Intellectual Property
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Registering your recipe with Story Protocol establishes your ownership and enables you to set licensing terms for others who want to use or adapt your creation.
            </Typography>
            
            <Paper elevation={0} sx={{ bgcolor: 'primary.light', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle1">{recipeData?.title || 'Unnamed Recipe'}</Typography>
              <Typography variant="body2" noWrap>{recipeData?.description || 'No description'}</Typography>
            </Paper>
            
            <FormControl fullWidth>
              <FormLabel>License Type</FormLabel>
              <Select 
                name="licenseType"
                value={licenseTerms.licenseType}
                onChange={(e) => setLicenseTerms({...licenseTerms, licenseType: e.target.value})}
                sx={{ mt: 1 }}
              >
                <MenuItem value="Attribution">Attribution</MenuItem>
                <MenuItem value="Attribution-ShareAlike">Attribution-ShareAlike</MenuItem>
                <MenuItem value="Attribution-NonCommercial">Attribution-NonCommercial</MenuItem>
                <MenuItem value="Attribution-NonCommercial-ShareAlike">Attribution-NonCommercial-ShareAlike</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl component="fieldset">
              <FormLabel component="legend">Usage Permissions</FormLabel>
              <Stack sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      name="commercial" 
                      checked={licenseTerms.commercial}
                      onChange={handleLicenseChange}
                    />
                  }
                  label="Allow commercial use"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      name="derivatives" 
                      checked={licenseTerms.derivatives}
                      onChange={handleLicenseChange}
                    />
                  }
                  label="Allow derivative works"
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      name="reciprocal" 
                      checked={licenseTerms.reciprocal}
                      onChange={handleLicenseChange}
                      disabled={!licenseTerms.derivatives}
                    />
                  }
                  label="Require derivatives to use the same license"
                />
              </Stack>
            </FormControl>
            
            <FormControl fullWidth>
              <FormLabel>Royalty Percentage</FormLabel>
              <TextField 
                name="royaltyAmount"
                type="number" 
                value={licenseTerms.royaltyAmount}
                onChange={handleLicenseChange}
                inputProps={{
                  min: 0,
                  max: 30,
                  step: 0.5
                }}
                margin="normal"
                size="small"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Percentage of revenue you'll receive when others use your recipe commercially
              </Typography>
            </FormControl>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleRegistration}
                disabled={isRegistering}
              >
                {isRegistering ? 'Registering...' : 'Register Recipe'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Modal>
    </>
  );
};

export default RecipeIPRegistration;
