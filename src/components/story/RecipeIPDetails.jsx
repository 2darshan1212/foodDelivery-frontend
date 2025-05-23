import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert
} from '@mui/material';
import { useStoryProtocol } from '../../providers/StoryProtocolProvider';
import { toast } from 'react-hot-toast';

const RecipeIPDetails = ({ recipeId }) => {
  const { client, isInitialized } = useStoryProtocol();
  const [ipAsset, setIpAsset] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [derivatives, setDerivatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIpDetails = async () => {
      if (!isInitialized || !recipeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch IP asset details
        const asset = await client.ipAsset.get(recipeId);
        setIpAsset(asset);

        // Fetch licenses for this IP
        const licenseData = await client.license.getByIpId(recipeId);
        setLicenses(licenseData);

        // Fetch derivative works
        const derivativeData = await client.ipAsset.getDerivatives(recipeId);
        setDerivatives(derivativeData);

      } catch (err) {
        console.error('Error fetching IP details:', err);
        setError(err.message || 'Failed to fetch IP details');
        toast.error('Failed to load IP information');
      } finally {
        setLoading(false);
      }
    };

    fetchIpDetails();
  }, [client, isInitialized, recipeId]);

  if (!isInitialized) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Story Protocol is initializing. Please wait a moment to view IP details.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography color="error">Error: {error}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!ipAsset) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography>
            This recipe has not been registered with Story Protocol yet.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => toast.info('Please use the "Register Recipe as IP" button on the recipe page')}
          >
            Register This Recipe
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom>
            Intellectual Property Information
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                IP ID
              </Typography>
              <Typography variant="body2" gutterBottom>
                {ipAsset.ipId}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Owner
              </Typography>
              <Typography variant="body2" gutterBottom>
                {ipAsset.owner}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Registration Date
              </Typography>
              <Typography variant="body2" gutterBottom>
                {new Date(ipAsset.registrationDate * 1000).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={ipAsset.status || 'Registered'}
                color="success"
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* License Information */}
      <Typography variant="h6" gutterBottom>
        License Information
      </Typography>
      {licenses.length > 0 ? (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>License ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Commercial Use</TableCell>
                <TableCell>Derivatives</TableCell>
                <TableCell>Royalty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {licenses.map((license) => (
                <TableRow key={license.licenseId}>
                  <TableCell>{license.licenseId}</TableCell>
                  <TableCell>{license.licenseTemplate}</TableCell>
                  <TableCell>
                    {license.commercial ? (
                      <Chip label="Allowed" color="success" size="small" />
                    ) : (
                      <Chip label="Not Allowed" color="error" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {license.derivatives ? (
                      <Chip label="Allowed" color="success" size="small" />
                    ) : (
                      <Chip label="Not Allowed" color="error" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{license.royaltyAmount}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No licenses have been created for this recipe.
        </Typography>
      )}

      {/* Derivative Works */}
      <Typography variant="h6" gutterBottom>
        Derivative Works
      </Typography>
      {derivatives.length > 0 ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Derivative IP</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Registration Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {derivatives.map((derivative) => (
                <TableRow key={derivative.ipId}>
                  <TableCell>{derivative.ipId}</TableCell>
                  <TableCell>{derivative.owner}</TableCell>
                  <TableCell>
                    {new Date(derivative.registrationDate * 1000).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary">
          No derivative works have been registered for this recipe.
        </Typography>
      )}
    </Box>
  );
};

export default RecipeIPDetails;
