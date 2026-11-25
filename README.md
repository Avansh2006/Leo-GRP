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

### 🌍 Multiple RP Servers
- Pick your server in onboarding or on the Profile page; each server keeps its own profile, shifts and records
- Everything server-specific (departments, commands, radio, loadouts, laws, arrest rules) lives in a **server pack** under `servers/`
- Built-in: Grand RP (EN3) and a generic starter template
- **Want your server added?** See [CONTRIBUTING.md](CONTRIBUTING.md). Admins can convert their law sheet with the in-app Law Importer

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

Each server's laws live in its pack:

1. **Export from Google Sheets** (File → Download → Web Page (.html)), or use a CSV/XLSX with a header row
2. **Put the files** in `servers/<server-id>/sources/` and list them in that pack's `legislation.json`
3. **Build** the law file the app loads:

   ```bash
   npm run import-laws
   ```

   This writes `public/servers/<server-id>/laws.json`. No dev setup? Use the in-app **Law Importer** (`/tools/law-importer`).
   Full steps: [CONTRIBUTING.md](CONTRIBUTING.md)

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
├── servers/                  # Server packs: one folder per RP server
│   ├── grandrp-en3/          # departments, commands, presets, legislation + sources/
│   ├── generic/              # starter template for new servers
│   └── registry.ts           # list of available servers
├── public/servers/<id>/
│   └── laws.json             # compiled laws (built by npm run import-laws)
├── utils/
│   ├── lawImport.ts          # law importers (Google Sheets HTML, CSV/XLSX, JSON)
│   └── htmlParser.ts         # loads the active server's laws.json
└── scripts/
    ├── import-laws.mjs       # builds laws.json from each pack's sources
    └── check-packs.mjs       # validates every server pack
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

### Adding Bodycam Commands, Departments or Loadouts

Edit the server's pack in `servers/<server-id>/` (`commands.json`, `departments.json`, `presets.json`).
Use `{dept}` in command text wherever the officer's department belongs. Format: [servers/README.md](servers/README.md).

```json
{
  "id": "cmd-launch-drone",
  "label": "WHILE ON DUTY - launch the {dept} drone.",
  "text": "/me launches {dept} drone",
  "palette": { "title": "Launch {dept} Drone", "icon": "🚁", "keywords": ["drone"] }
}
```

Run `npm run check-packs` after editing.

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
- Make sure `public/servers/<server-id>/laws.json` exists (run `npm run import-laws`)
- Run `npm run check-packs` to spot missing or outdated files
- Check the browser console for errors

### Theme not persisting
- Check browser localStorage is enabled
- Clear cache and reload

### Duty logs not saving
- Verify localStorage is not full
- Check browser privacy settings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

**Adding a server?** Follow [CONTRIBUTING.md](CONTRIBUTING.md) and run `npm run check-packs` before opening the PR.

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
