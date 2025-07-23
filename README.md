# $AQUA - AquaCatCoin Website

A modern, responsive landing page for $AQUA, the soggy meme coin on the SUI Network. Built with pure HTML, CSS, and JavaScript featuring advanced animations, sparkle effects, and a comprehensive tokenomics breakdown.

## 🌊 Project Overview

$AQUA is a meme coin that tells the story of a cat who's always caught in the rain but can't hold an umbrella. This website serves as the official landing page, providing visitors with project information, tokenomics, roadmap, and purchase instructions.

**Live Website:** https://www.aquacatcoin.xyz

## ✨ Features

### Visual Effects
- **Hero Sparkle Animation**: 30 animated sparkles in the hero section
- **Floating Cat Image**: Gentle bobbing animation in the About section
- **Gradient Text Effects**: Dynamic gradient animations on headers and the $AQUA ticker
- **Scroll-Triggered Animations**: Elements fade in as you scroll
- **Animated Progress Bars**: Tokenomics allocation bars animate on scroll
- **Timeline Drawing Effect**: Roadmap timeline draws itself as you scroll
- **Hover Effects**: Cards lift and glow on hover, buttons scale and transform

### Content Sections
1. **Hero Section**: Main logo, tagline, call-to-action buttons, and SUI network badge
2. **About Section**: The legend of $AQUA with floating mascot image
3. **Tokenomics**: Detailed token allocation with animated progress bars
4. **Roadmap**: Three-phase development timeline
5. **How to Buy**: Step-by-step purchase guide with wallet links
6. **Footer**: Social links and disclaimer

### Technical Features
- **Fully Responsive**: Works on desktop, tablet, and mobile
- **SEO Optimized**: Meta tags, Open Graph, Twitter Cards
- **Performance Optimized**: Efficient CSS animations and minimal JavaScript
- **Accessibility**: Proper ARIA labels and semantic HTML

## 📁 File Structure

```
/
├── index.html          # Main HTML file
├── style.css           # All styles and animations
├── script.js           # JavaScript for animations and interactions
├── aquacat.png         # Main mascot image
├── sui.png             # SUI network logo
├── favicon.png         # Website favicon (to be created)
├── robots.txt          # Search engine crawler instructions
├── sitemap.xml         # XML sitemap for SEO
└── README.md           # This documentation file
```

## 🎨 Design System

### Color Palette (SUI Network Theme)
- **Main Blue**: `#4DA2FF` - Primary brand color
- **Accent Dark**: `#011829` - Dark backgrounds and text
- **Animation Light**: `#C0E6FF` - Light accents and animations
- **White**: `#ffffff` - Text and backgrounds
- **Text Light**: `#f0f8ff` - Light text on dark backgrounds

### Typography
- **Headers**: Fredoka One (Google Fonts) - Playful, rounded font
- **Body**: Poppins (Google Fonts) - Clean, modern sans-serif

### Animations
- **Fade In**: Elements appear with opacity and transform transitions
- **Sparkles**: Random positioned elements with scale and opacity keyframes
- **Floating**: Gentle Y-axis movement using sine wave motion
- **Progress Bars**: ScaleX transformation from 0 to full width
- **Hover Effects**: Transform, scale, and box-shadow transitions

## 🚀 Deployment Instructions

### Requirements
- Web hosting with cPanel or similar
- Domain name configured
- FTP/File Manager access

### Step-by-Step Deployment

1. **Upload Files**
   - Upload all files to your web server's public directory (usually `public_html`)
   - Ensure file names match exactly (case-sensitive on most servers)

2. **Set File Permissions**
   - **Files** (HTML, CSS, JS, images): `644`
   - **Directories**: `755`

3. **Update Domain References**
   - Replace `https://www.aquacatcoin.xyz` in the following files:
     - `index.html` (meta tags)
     - `robots.txt` (sitemap URL)
     - `sitemap.xml` (location URL)

4. **Create Favicon**
   - Generate a favicon from `aquacat.png` using a favicon generator
   - Save as `favicon.png` in the root directory

### Cache Management
If changes don't appear after upload:
1. Clear browser cache with hard refresh (`Ctrl+F5`)
2. Purge server cache in cPanel (look for LiteSpeed Cache Manager)
3. Use cache-busting by adding version numbers to CSS/JS files

## 🔧 Customization Guide

### Updating Content
- **Tokenomics**: Modify the allocation cards in `index.html` and update percentages in `style.css`
- **Roadmap**: Edit the roadmap items in the timeline section
- **Social Links**: Update URLs in both hero section and footer
- **Images**: Replace `aquacat.png` and `sui.png` with new images (maintain aspect ratios)

### Adding New Animations
1. Create CSS keyframe animations in `style.css`
2. Add JavaScript triggers in `script.js` if needed
3. Use the existing scroll animation system by adding `scroll-animate` class

### Color Theme Changes
Update CSS custom properties in `:root` section of `style.css`:
```css
:root {
  --main-blue: #4DA2FF;
  --accent-dark: #011829;
  --anim-light: #C0E6FF;
  /* ... other colors */
}
```

## 🐛 Troubleshooting

### Common Issues

**Website not loading styles:**
- Check file permissions (files should be 644)
- Clear server cache in cPanel
- Verify CSS file uploaded correctly
- Check browser console for 404 errors

**Animations not working:**
- Ensure JavaScript is enabled
- Check for console errors in browser dev tools
- Verify Font Awesome CSS is loading

**Mobile responsiveness issues:**
- Test viewport meta tag is present
- Check CSS media queries
- Validate responsive grid layouts

**SEO not working:**
- Update meta tags with correct domain
- Submit sitemap to search engines
- Verify robots.txt accessibility

## 📊 Current Tokenomics (as of latest update)

- **Total Supply**: 1,000,000,000 $AQUA (Fixed)
- **Liquidity Pool**: 72.5% (725M $AQUA)
- **Marketing**: 10.0% (100M $AQUA)
- **Treasury**: 5.0% (50M $AQUA)
- **Developer Wallet**: 5.0% (50M $AQUA)
- **Airdrops**: 3.0% (30M $AQUA)
- **Team**: 2.0% (20M $AQUA)

## 🔗 Important Links

- **Website**: https://www.aquacatcoin.xyz
- **Twitter/X**: https://x.com/AQUA_on_SUI
- **Telegram**: https://t.me/AQUA_CAT_ON_SUI
- **DEX**: https://cetus.zone (for trading)
- **Wallets**: 
  - Slush Wallet: https://slush.app/
  - Phantom: https://phantom.com/download

## 🏗️ Development Notes

### Performance Considerations
- CSS animations use `transform` and `opacity` for optimal performance
- JavaScript is minimal and uses event delegation
- Images should be optimized for web (WebP recommended)
- Consider lazy loading for images if adding more content

### Browser Compatibility
- Modern browsers (Chrome 60+, Firefox 60+, Safari 12+)
- CSS Grid and Flexbox support required
- ES6 JavaScript features used

### Future Enhancements
- Consider adding a mobile hamburger menu
- Implement lazy loading for images
- Add more interactive elements
- Consider PWA features for mobile users

## 📝 Version History

- **v1.0**: Initial release with basic layout
- **v1.1**: Added advanced animations and tokenomics
- **v1.2**: Implemented responsive design and SEO
- **v1.3**: Added cache-busting and deployment fixes

---

**Built with 💙 for the $AQUA community**

*Remember: $AQUA wants to be as forthcoming as felinely possible in the crypto space.* 