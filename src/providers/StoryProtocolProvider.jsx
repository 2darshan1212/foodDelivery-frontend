import React, { createContext, useContext, useState, useEffect } from 'react';
import { StoryClient } from '@story-protocol/core-sdk';
import { ethers } from 'ethers';
import { useSelector } from 'react-redux';

// Create context
const StoryProtocolContext = createContext(null);

// Custom hook to use the Story Protocol context
export const useStoryProtocol = () => {
  const context = useContext(StoryProtocolContext);
  if (!context) {
    throw new Error('useStoryProtocol must be used within a StoryProtocolProvider');
  }
  return context;
};

export const StoryProtocolProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useSelector((state) => state.auth);

  // Initialize the Story Protocol client
  useEffect(() => {
    const initializeClient = async () => {
      try {
        console.log('Initializing Story Protocol client...');
        
        // For demonstration purposes, we're using a local mock provider
        // This will always succeed without actually connecting to a blockchain
        let provider;
        try {
          // Try to connect to the Aeneid testnet
          provider = new ethers.providers.JsonRpcProvider(
            'https://aeneid.rpc.storyprotocol.net'
          );
        } catch (providerError) {
          console.warn('Could not connect to Aeneid testnet, using dummy provider', providerError);
          // Fallback to a dummy provider for demonstration
          provider = new ethers.providers.JsonRpcProvider();
        }
        
        // Using a dummy wallet for demonstration purposes
        const wallet = ethers.Wallet.createRandom().connect(provider);
        
        // Create a mock client if the real one fails
        let storyClient;
        try {
          storyClient = StoryClient.newClient({
            networkConfig: {
              chain: 'aeneid',
              provider
            },
            signer: wallet
          });
        } catch (clientError) {
          console.warn('Could not initialize StoryClient, creating mock client', clientError);
          // Create a mock client with the same interface
          storyClient = createMockStoryClient();
        }

        setClient(storyClient);
        setIsInitialized(true);
        console.log('Story Protocol client initialized successfully (may be using mock)');
      } catch (err) {
        console.error('Failed to initialize Story Protocol client:', err);
        setError(err.message || 'Failed to initialize Story Protocol client');
        // Even on error, set isInitialized to true so the UI can still function
        setIsInitialized(true);
      }
    };

    // Always initialize, even without a user
    if (!isInitialized) {
      initializeClient();
    }
  }, [isInitialized]);
  
  // Helper function to create a mock Story Protocol client for demonstration
  const createMockStoryClient = () => {
    return {
      ipAsset: {
        register: async (data) => {
          console.log('MOCK: Registering IP asset:', data);
          return { 
            ipId: 'ip-' + Math.random().toString(36).substring(2, 10),
            tokenId: data.tokenId,
            owner: user?._id || 'anonymous-user'
          };
        },
        registerDerivative: async (data) => {
          console.log('MOCK: Registering derivative IP asset:', data);
          return { success: true, parentIpId: data.parentIpId, childIpId: data.childIpId };
        },
        get: async (ipId) => {
          console.log('MOCK: Getting IP asset:', ipId);
          return {
            ipId,
            owner: user?._id || 'anonymous-user',
            registrationDate: Math.floor(Date.now() / 1000),
            status: 'REGISTERED'
          };
        },
        getDerivatives: async (ipId) => {
          console.log('MOCK: Getting derivatives for IP asset:', ipId);
          return [];
        }
      },
      license: {
        create: async (data) => {
          console.log('MOCK: Creating license:', data);
          return { 
            licenseId: 'license-' + Math.random().toString(36).substring(2, 10),
            ipId: data.ipId,
            licenseTemplate: data.licenseTemplate,
            commercial: data.commercial,
            derivatives: data.derivatives,
            reciprocal: data.reciprocal,
            attribution: data.attribution,
            royaltyAmount: data.royaltyAmount
          };
        },
        getByIpId: async (ipId) => {
          console.log('MOCK: Getting licenses for IP asset:', ipId);
          return [];
        }
      },
      payment: {
        pay: async (data) => {
          console.log('MOCK: Making payment:', data);
          return { success: true, ipId: data.ipId, amount: data.amount };
        }
      }
    };
  };

  // Register an IP asset (recipe)
  const registerRecipeAsIP = async (recipe) => {
    if (!client) return null;
    
    try {
      console.log('Registering recipe as IP asset:', recipe);
      
      // Prepare the metadata for the IP asset
      const metadata = {
        name: recipe.title || 'Unnamed Recipe',
        description: recipe.description || 'No description provided',
        external_url: `https://foodapp.example.com/recipes/${recipe.id}`,
        image: recipe.image || '',
        attributes: [
          {
            trait_type: 'Category',
            value: recipe.category || 'Uncategorized'
          },
          {
            trait_type: 'Creator',
            value: recipe.chef || 'Anonymous'
          },
          {
            trait_type: 'Preparation Time',
            value: recipe.prepTime || 'Unknown'
          },
          {
            trait_type: 'Cuisine',
            value: recipe.cuisine || 'Global'
          }
        ]
      };
      
      // Register the IP asset
      const registrationResult = await client.ipAsset.register({
        tokenContractAddress: '0x1234567890123456789012345678901234567890', // Demo contract address
        tokenId: recipe.id.toString(),
        metadataUri: JSON.stringify(metadata), // In production, you'd upload this to IPFS
      });
      
      console.log('Recipe registered as IP asset:', registrationResult);
      return registrationResult;
    } catch (err) {
      console.error('Failed to register recipe as IP asset:', err);
      throw err;
    }
  };

  // Create a license for a recipe
  const createRecipeLicense = async (recipeId, licenseTerms) => {
    if (!client) return null;
    
    try {
      console.log('Creating license for recipe:', recipeId, licenseTerms);
      
      // Prepare the license terms
      const licenseData = {
        ipId: recipeId,
        licenseTemplate: 'Attribution-NonCommercial', // Default license type
        commercial: licenseTerms.commercial || false,
        derivatives: licenseTerms.derivatives || false,
        reciprocal: licenseTerms.reciprocal || false,
        attribution: true, // Always require attribution
        royaltyAmount: licenseTerms.royaltyAmount || 0
      };
      
      // Create the license
      const licenseResult = await client.license.create(licenseData);
      
      console.log('Recipe license created:', licenseResult);
      return licenseResult;
    } catch (err) {
      console.error('Failed to create recipe license:', err);
      throw err;
    }
  };

  // Create a derivative recipe
  const registerDerivativeRecipe = async (originalRecipeId, derivativeRecipe) => {
    if (!client) return null;
    
    try {
      console.log('Registering derivative recipe:', derivativeRecipe, 'from original:', originalRecipeId);
      
      // First register the derivative recipe as a new IP asset
      const registrationResult = await registerRecipeAsIP(derivativeRecipe);
      
      // Then link it to the original recipe
      const derivativeResult = await client.ipAsset.registerDerivative({
        parentIpId: originalRecipeId,
        childIpId: registrationResult.ipId,
      });
      
      console.log('Derivative recipe registered:', derivativeResult);
      return derivativeResult;
    } catch (err) {
      console.error('Failed to register derivative recipe:', err);
      throw err;
    }
  };

  // Pay royalties to a recipe creator
  const payRecipeCreator = async (recipeId, amount) => {
    if (!client) return null;
    
    try {
      console.log('Paying royalties to recipe creator:', recipeId, amount);
      
      // Make the payment
      const paymentResult = await client.payment.pay({
        ipId: recipeId,
        amount,
      });
      
      console.log('Payment made to recipe creator:', paymentResult);
      return paymentResult;
    } catch (err) {
      console.error('Failed to pay recipe creator:', err);
      throw err;
    }
  };

  // Check if the user has a license for a recipe
  const checkRecipeLicense = async (recipeId, userAddress) => {
    if (!client) return false;
    
    try {
      console.log('Checking if user has license for recipe:', recipeId, userAddress);
      
      // Query for licenses
      const licenses = await client.license.getByIpId(recipeId);
      
      // Check if the user has any of these licenses
      const hasLicense = licenses.some(license => 
        license.licenseHolder.toLowerCase() === userAddress.toLowerCase()
      );
      
      return hasLicense;
    } catch (err) {
      console.error('Failed to check recipe license:', err);
      return false;
    }
  };

  // The context value that will be provided
  const contextValue = {
    client,
    isInitialized,
    error,
    registerRecipeAsIP,
    createRecipeLicense,
    registerDerivativeRecipe,
    payRecipeCreator,
    checkRecipeLicense
  };

  return (
    <StoryProtocolContext.Provider value={contextValue}>
      {children}
    </StoryProtocolContext.Provider>
  );
};

export default StoryProtocolProvider;
