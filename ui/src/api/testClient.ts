import apiClient from './client';

// Set authentication credentials
apiClient.setAuthCredentials('user', 'password');

// Test function to verify client implementation
async function testApiClient() {
  try {
    console.log('Testing API client...');
    
    // Test profiles API
    console.log('\n--- Testing Profiles API ---');
    console.log('Getting all profiles...');
    const profiles = await apiClient.profiles.getProfiles();
    console.log(`Found ${profiles.length} profiles.`);
    
    if (profiles.length > 0) {
      console.log(`Getting profile with ID ${profiles[0].id}...`);
      const profile = await apiClient.profiles.getProfile(profiles[0].id);
      console.log(`Retrieved profile: ${profile.name}`);
    }
    
    // Test detections API
    console.log('\n--- Testing Detections API ---');
    console.log('Listing detections...');
    const detections = await apiClient.detections.listDetections({
      limit: 5,
      filter: {
        is_relevant: true
      }
    });
    console.log(`Found ${detections.length} relevant detections.`);
    
    // Test subreddits API
    console.log('\n--- Testing Subreddits API ---');
    console.log('Getting all subreddits...');
    const subreddits = await apiClient.subreddits.getAllSubreddits();
    console.log(`Found ${subreddits.length} subreddits.`);
    
    if (profiles.length > 0) {
      console.log(`Getting subreddits for profile ${profiles[0].id}...`);
      const profileSubreddits = await apiClient.subreddits.getSubredditsForProfile(profiles[0].id);
      console.log(`Found ${profileSubreddits.length} subreddits for profile.`);
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during API client testing:', error);
  }
}

// Run the test (comment this out if you don't want it to run immediately)
// testApiClient();

// Export the test function for manual execution
export { testApiClient }; 