
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

async function testBunny() {
  const storageZone = 'iqstorge';
  const apiKey = '6cece24c-f8b3-432d-91997e345eca-a602-4c16';
  const pullZone = 'cdn.blackt.uk';
  const region = 'storage.bunnycdn.com';

  const hash = crypto.randomBytes(16).toString('hex');
  const storedName = `${hash}.txt`;
  const bunnyPath = `${storageZone}/${storedName}`;
  const url = `https://${region}/${bunnyPath}`;

  console.log('Testing upload to:', url);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'text/plain',
      },
      body: 'Hello Bunny',
    });

    console.log('Status:', response.status, response.statusText);
    const text = await response.text();
    console.log('Response:', text);

    if (response.ok) {
      console.log('Upload successful!');
      console.log('Pull URL:', `https://${pullZone}/${storedName}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testBunny();
