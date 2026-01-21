# 🚔 Grand RP LEO Toolkit

<div align="center">

![Grand RP LEO Toolkit](https://img.shields.io/badge/Grand%20RP-LEO%20Toolkit-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A comprehensive web application for Law Enforcement Officers in Grand RP**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Demo](#-demo)

Made with ❤️ by **Avansh Yadav (EN3)** - Server Administrator

</div>

---

## ✨ Features

### 📹 Bodycam Commands
- **Organization Selector**: Choose from FIB, EMS, NG, SAHP, LSPD, or GOV
- Pre-written roleplay commands for all police scenarios
- One-click copy-to-clipboard functionality
- Comprehensive coverage: uniform, undercover, traffic stops, arrests, investigations, and more
- Organized in collapsible categories for easy navigation

### 📚 Patrolman's Guide
- **Complete Law Reference**: Parsed from official Google Sheets HTML exports
- **Smart Search**: Search by code number or description
- **Category Filtering**: Filter between Penal Codes, Traffic Codes, and more
- **Detailed Information**: Code, description, fine, sentence, stars, bail, and remarks
- **Quick Actions**:
  - Copy individual charges
  - Add charges to evidence report
  - Copy all charges at once (auto-increments arrest count)
- Pagination for easy browsing

### 📝 Evidence & Shift Report Generator
- **Evidence Reports**:
  - Date and time tracking (PC time displayed, GMT+0 for reports)
  - Detailed incident description
  - Charge search and selection from patrolman's guide
  - Bodycam footage, proof, and license plate links
  - Auto-formatted professional output
  - Increments fine count when generating

- **Shift Reports**:
  - Officer information (Name, ID, Rank, Badge Number)
  - **Multiple Vest Selection**: Add multiple vests (same or different types)
  - **Weapon Management**: 
    - Dropdown menu with 13+ weapon types
    - Custom ammo amount for each weapon
    - Easy add/remove functionality
  - Duty tracking with start/end timestamps (GMT+0)
  - Events attended logging
  - Arrest and fine counters
  - Automated weapon tracking (taken & returned)

### 👤 Profile & Duty Logs
- **Performance Dashboard**: View total arrests, fines, and time on duty
- **Duty History**: Complete log of all shifts with detailed breakdowns
- **Statistics**: Track your performance over time
- **Equipment Tracking**: Historical record of weapons and vests used

### 🎨 Theme System
- **Dark/Light Mode**: Toggle between themes with smooth transitions
- **Persistent Preference**: Theme choice saved in browser
- **Optimized Design**: Eye-friendly color schemes for extended use
- **Responsive Layout**: Perfect on desktop, tablet, and mobile

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom theme variables
- **HTML Parsing**: DOMParser for Google Sheets HTML exports
- **State Management**: React Context API (ThemeContext, DutyContext)
- **Storage**: LocalStorage for persistence
- **UI Components**: Custom reusable components with dark/light theme support

## 🚀 Installation

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/Avansh2006/Leo-GRP.git
cd Leo-GRP
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:3000
```

### Building for Production

```bash
npm run build
npm start
```

## 📖 Usage

### Setting Up Law Data

1. **Export from Google Sheets**: 
   - Open your law codes spreadsheet
   - Go to File → Download → Web Page (.html)
   
2. **Place HTML files** in `public/data/` directory:
   - `Penal Code.html` - Penal codes
   - `Traffic Codes.html` - Traffic regulations
   - `Article 7.html` - Additional laws
   - `Arresting Procedure.html`
   - `Impound Fees.html`

3. The app automatically parses these files and makes them searchable

### Starting Your Shift

1. Navigate to **Reports** page
2. Fill in your officer information
3. Select vests (can add multiple)
4. Add weapons from dropdown and enter ammo amounts
5. Click **Start Duty**
6. Your shift is now tracked!

### Generating Evidence Reports

1. Go to **Reports** page
2. Fill in date, time, and description
3. Search and add charges from patrolman's guide
4. Add bodycam links and other evidence
5. Click **Generate & Copy Report**
6. Fine count automatically increments

### Ending Your Shift

1. Enter events attended during shift
2. Click **End Duty & Generate Report**
3. Formatted shift report is copied to clipboard
4. Duty log saved to profile with all statistics

## 📁 Project Structure

```
leo-grp/
├── app/
│   ├── bodycam-commands/     # Bodycam commands page with org selector
│   ├── patrolman-guide/      # Law codes reference with search
│   ├── reports/              # Evidence & shift report generator
│   ├── profile/              # Duty logs and statistics dashboard
│   ├── layout.tsx            # Root layout with theme & duty providers
│   ├── page.tsx              # Home page with feature overview
│   └── globals.css           # Global styles & theme variables
├── components/
│   ├── Navbar.tsx            # Navigation with theme toggle & duty status
│   ├── CopyButton.tsx        # Reusable copy-to-clipboard button
│   └── ToastProvider.tsx     # Toast notification system
├── contexts/
│   ├── ThemeContext.tsx      # Theme state management
│   └── DutyContext.tsx       # Duty tracking & logs management
├── data/
│   └── bodycam-commands.json # Bodycam command templates
├── public/data/
│   ├── Penal Code.html       # Official penal codes (HTML)
│   ├── Traffic Codes.html    # Traffic regulations (HTML)
│   ├── Article 7.html        # Additional laws (HTML)
│   ├── Arresting Procedure.html
│   └── Impound Fees.html
├── utils/
│   └── htmlParser.ts         # HTML parsing utilities for law data
└── scripts/
    └── generateSampleExcel.js # Sample data generator
```

## 🎯 Key Features Explained

### Dual Time System
- **PC Time**: Displayed to user for reference
- **Game Time (GMT+0)**: Used in generated reports for server consistency
- Automatic conversion ensures accurate timestamps

### Performance Tracking
- **Arrest Counter**: Increments when copying all charges from patrolman's guide
- **Fine Counter**: Increments when generating evidence reports
- **Duty Logs**: Saved to localStorage with complete shift details
- **Statistics Dashboard**: View performance metrics in profile

### Weapon Management
Comprehensive weapon list includes:
- Armor-piercing pistol
- Stun gun
- PDW submachine gun
- Shotgun & Heavy shotgun
- Assault rifle variants (Standard, Bullpup, Carbine, AUG)
- Sniper rifle
- Light machine gun
- Police baton
- Balaclava

### Theme System
Custom CSS variables enable smooth theme transitions:
```css
--bg-primary, --bg-secondary, --bg-tertiary
--text-primary, --text-secondary, --text-muted
--border-color, --accent-primary, --accent-secondary
```

## 🎨 Customization

### Adding Bodycam Commands

Edit `data/bodycam-commands.json`:

```json
{
  "categories": [
    {
      "id": "category-id",
      "name": "Category Name",
      "commands": [
        {
          "id": "command-id",
          "label": "Command Label",
          "command": "/me does something",
          "orgs": ["LSPD", "SAHP", "FIB"]
        }
      ]
    }
  ]
}
```

### Modifying Weapons/Vests

Edit `app/reports/page.tsx`:

```typescript
const VESTS = [
  'Vest Level 1',
  'Vest Level 2',
  // Add more...
]

const WEAPONS = [
  'Weapon Name',
  // Add more...
]
```

## 🐛 Troubleshooting

### Law data not loading
- Ensure HTML files are in `public/data/` directory
- Check browser console for parsing errors
- Verify HTML files are valid Google Sheets exports

### Theme not persisting
- Check browser localStorage is enabled
- Clear cache and reload

### Duty logs not saving
- Verify localStorage is not full
- Check browser privacy settings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available for use within the Grand RP community.

## 👨‍💻 Author

**Avansh Yadav (EN3)**
- Role: Server Administrator
- GitHub: [@Avansh2006](https://github.com/Avansh2006)

## 🙏 Acknowledgments

- Grand RP community for feedback and testing
- Next.js team for the amazing framework
- All LEO officers who provided input on features

## 📧 Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/Avansh2006/Leo-GRP/issues)
- Contact via Grand RP Discord

---

<div align="center">

**⭐ If you find this useful, please star the repository! ⭐**

Made with 💙 for the Grand RP LEO Community

</div>
