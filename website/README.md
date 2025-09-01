# i cant code - Website

This is the official website for the "i cant code" desktop application - an AI-powered code explanation tool.

## Features

- **Modern Design**: Built with Next.js 14 and Tailwind CSS
- **Responsive Layout**: Works perfectly on all devices
- **Download Management**: Integrates with GitHub releases for app downloads
- **User Authentication**: Login and registration system
- **Cross-Platform Support**: Download options for macOS, Windows, and Linux

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **TypeScript**: Full type safety
- **Responsive**: Mobile-first design

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the website directory:
   ```bash
   cd website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Configuration

### GitHub Integration

To enable GitHub releases integration, update the GitHub username in the download page:

1. Open `app/download/page.tsx`
2. Replace `yourusername` with your actual GitHub username in the API URL:
   ```typescript
   const response = await fetch('https://api.github.com/repos/YOUR_USERNAME/i-cant-code/releases')
   ```

### Customization

- **Colors**: Update the primary color scheme in `tailwind.config.js`
- **Content**: Modify text and descriptions in the page components
- **Styling**: Customize CSS classes and components as needed

## Project Structure

```
website/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Homepage
│   ├── download/          # Download page
│   │   └── page.tsx
│   └── login/             # Login/Register page
│       └── page.tsx
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Pages

### Homepage (`/`)
- Hero section with app description
- Feature highlights
- Download call-to-action
- Navigation to other pages

### Download (`/download`)
- GitHub releases integration
- Platform-specific download options
- Installation instructions
- Release history

### Login (`/login`)
- User authentication form
- GitHub OAuth integration
- Registration and login toggle
- Form validation

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically on push

### Other Platforms

The website can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- DigitalOcean App Platform
- Self-hosted servers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the main project LICENSE file for details.

## Support

For website-related issues or questions:
- Create an issue in the GitHub repository
- Check the documentation
- Contact the development team

## Roadmap

- [ ] User dashboard
- [ ] Analytics integration
- [ ] Blog section
- [ ] Documentation pages
- [ ] Multi-language support
- [ ] Dark mode toggle

