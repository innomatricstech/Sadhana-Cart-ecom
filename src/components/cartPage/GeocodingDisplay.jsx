import React, { useState, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

// --- YOUR CONFIGURATION ---
const googleMapsApiKey = 'AIzaSyBRtfNCLj1OliMg8EYlGkEwiPrAyw92bQA'; 
const libraries = []; 

function Geocoder() {
  const [address, setAddress] = useState('1600 Amphitheatre Parkway, Mountain View, CA'); // Default address
  const [coordinates, setCoordinates] = useState(null);
  const [status, setStatus] = useState('');
  
  // Load the Google Maps API Script
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleMapsApiKey,
    libraries: libraries,
  });

  // Function to perform the geocoding
  const geocodeAddress = useCallback(() => {
    if (!isLoaded) {
      setStatus('API is still loading...');
      return;
    }

    if (!address.trim()) {
      setStatus('Please enter an address.');
      setCoordinates(null);
      return;
    }
    
    setStatus('Geocoding...');
    setCoordinates(null);

    // 1. Create a Geocoder instance
    const geocoder = new window.google.maps.Geocoder();

    // 2. Call the geocode method
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        // Success: Extract the lat and lng from the first result
        const location = results[0].geometry.location;
        const newCoordinates = {
          latitude: location.lat(), // Note the function calls .lat() and .lng()
          longitude: location.lng(),
        };
        
        setCoordinates(newCoordinates);
        setStatus('Successfully geocoded address.');
        console.log("Geocoding Success:", newCoordinates);
        
      } else {
        // Error: No results found or API error
        setCoordinates(null);
        setStatus(`Geocoding failed. Status: ${status}.`);
        console.error("Geocoding Error:", status);
      }
    });
  }, [isLoaded, address]); // Recreate if 'isLoaded' or 'address' changes

  if (loadError) {
    return <div>Error loading Google Maps API: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div>Loading API...</div>;
  }

  // --- Render UI ---
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial' }}>
      <h2>🗺️ Geocoding Lookup</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter an address"
          style={{ padding: '10px', width: '70%', marginRight: '10px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={geocodeAddress} 
          style={{ padding: '10px 15px', backgroundColor: '#4285F4', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Get Coordinates
        </button>
      </div>

      <hr />

      <p>Status:{status}</p>

      {coordinates && (
        <div style={{ marginTop: '20px', border: '1px solid #eee', padding: '15px', backgroundColor: '#f9f9f9' }}>
          <h3>✅ Coordinates Found:</h3>
          <p>Original Address: `{address}`</p>
          <p>Latitude (lat): `{coordinates.lat}`</p>
          <p>Longitude (lng): `{coordinates.lng}`</p>
        </div>
      )}
    </div>
  );
}

export default Geocoder;