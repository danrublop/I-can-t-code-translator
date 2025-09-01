import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Version information for the app update system
    const versionInfo = {
      appVersion: "1.0.6",        // Latest app version available
      websiteVersion: "2.2.0",    // Website/API version (increment to force re-auth)
      releaseNotes: "New Update Features! 🔄\n\n• Added Check for Updates button in Settings\n• Fixed logout button functionality\n• Enhanced update checking system\n• Improved user authentication flow\n• Better error handling for network failures\n• Streamlined toolbar UI\n• Enhanced settings page with update controls",
      downloadUrl: "https://icantcode.app/download"
    };

    // Set CORS headers for cross-origin requests
    const response = NextResponse.json(versionInfo);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, User-Agent');
    
    return response;
  } catch (error) {
    console.error('Version API error:', error);
    return NextResponse.json(
      { error: 'Version check temporarily unavailable' },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
    },
  });
}
