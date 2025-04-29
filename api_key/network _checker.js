import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const NetworkStatus = () => {
  const [connectionType, setConnectionType] = useState('');
  const [bgColor, setBgColor] = useState('lime'); // Default color

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      let status;
      let color;

      switch (state.type) {
        case 'wifi':
        case 'cellular':
          if (state.isInternetReachable) {
            status = 'Good';
            color = 'skyblue'; 
          } else {
            status = 'Poor';
            color = 'orange'; 
          }
          break;
        case 'unknown':
          status = 'Normal';
          color = 'orange';
          break;
        default:
          status = 'Bad';
          color = 'red';
      }

      setConnectionType(status);
      setBgColor(color);
      // Alert.alert(`Network Status: ${status}`);
    });

  
    return () => unsubscribe(); 
  }, []);

  return (
    <View style={{ padding: 1, backgroundColor: bgColor }}>
      <Text style={{ color: 'white' }}>Current Network: {connectionType}</Text>
    </View>
  );
};

export default NetworkStatus;