// This script generates a sample Excel file with penal codes
// Run with: node scripts/generateSampleExcel.js

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Sample penal code data
const penalCodeData = [
  ['Penal Code', 'Description', 'Fine', 'Sentence', 'Stars', 'Bail', 'Remarks'],
  ['1.01', 'Possession of Controlled Substance', '$5,000', '30 minutes', '2', '$7,500', 'Class C Felony'],
  ['1.02', 'Sale of Controlled Substance', '$10,000', '60 minutes', '3', '$15,000', 'Class B Felony'],
  ['1.03', 'Manufacturing of Controlled Substance', '$20,000', '90 minutes', '4', '$30,000', 'Class A Felony'],
  ['1.04', 'Trafficking of Controlled Substance', '$50,000', '120 minutes', '5', '$75,000', 'Class A Felony'],
  ['2.01', 'Grand Theft Auto', '$8,000', '45 minutes', '3', '$12,000', 'Class B Felony'],
  ['2.02', 'Petty Theft', '$2,000', '15 minutes', '1', '$3,000', 'Class D Misdemeanor'],
  ['2.03', 'Burglary', '$7,000', '40 minutes', '2', '$10,000', 'Class C Felony'],
  ['2.04', 'Robbery', '$10,000', '60 minutes', '3', '$15,000', 'Class B Felony'],
  ['2.05', 'Armed Robbery', '$20,000', '90 minutes', '4', '$30,000', 'Class A Felony'],
  ['3.01', 'Assault', '$3,000', '20 minutes', '1', '$4,500', 'Class C Misdemeanor'],
  ['3.02', 'Battery', '$4,000', '25 minutes', '2', '$6,000', 'Class C Misdemeanor'],
  ['3.03', 'Assault with a Deadly Weapon', '$10,000', '60 minutes', '3', '$15,000', 'Class B Felony'],
  ['3.04', 'Attempted Murder', '$30,000', '100 minutes', '5', '$45,000', 'Class A Felony'],
  ['3.05', 'Murder', '$100,000', '180 minutes', '6', 'None', 'Capital Offense'],
  ['3.06', 'Manslaughter', '$25,000', '80 minutes', '4', '$37,500', 'Class A Felony'],
  ['4.01', 'Possession of Illegal Weapon', '$5,000', '30 minutes', '2', '$7,500', 'Class C Felony'],
  ['4.02', 'Brandishing a Firearm', '$7,000', '40 minutes', '3', '$10,000', 'Class B Felony'],
  ['4.03', 'Discharge of Firearm in City Limits', '$8,000', '45 minutes', '3', '$12,000', 'Class B Felony'],
  ['4.04', 'Drive-by Shooting', '$25,000', '90 minutes', '5', '$37,500', 'Class A Felony'],
  ['5.01', 'Resisting Arrest', '$3,000', '20 minutes', '1', '$4,500', 'Class C Misdemeanor'],
  ['5.02', 'Evading Police', '$5,000', '30 minutes', '2', '$7,500', 'Class C Felony'],
  ['5.03', 'Failure to Obey Traffic Control Device', '$500', '0 minutes', '0', 'N/A', 'Infraction'],
  ['5.04', 'Reckless Driving', '$2,000', '15 minutes', '1', '$3,000', 'Class D Misdemeanor'],
  ['5.05', 'Street Racing', '$5,000', '30 minutes', '2', '$7,500', 'Class C Felony'],
  ['6.01', 'Trespassing', '$1,000', '10 minutes', '0', '$1,500', 'Class D Misdemeanor'],
  ['6.02', 'Breaking and Entering', '$6,000', '35 minutes', '2', '$9,000', 'Class C Felony'],
  ['6.03', 'Vandalism', '$2,500', '15 minutes', '1', '$3,750', 'Class D Misdemeanor'],
  ['6.04', 'Arson', '$15,000', '70 minutes', '4', '$22,500', 'Class A Felony'],
  ['7.01', 'Kidnapping', '$20,000', '80 minutes', '4', '$30,000', 'Class A Felony'],
  ['7.02', 'Hostage Taking', '$25,000', '90 minutes', '5', '$37,500', 'Class A Felony'],
  ['7.03', 'Extortion', '$10,000', '50 minutes', '3', '$15,000', 'Class B Felony'],
  ['7.04', 'Fraud', '$8,000', '40 minutes', '2', '$12,000', 'Class C Felony'],
  ['8.01', 'Public Intoxication', '$500', '5 minutes', '0', 'N/A', 'Infraction'],
  ['8.02', 'Disturbing the Peace', '$1,000', '10 minutes', '0', '$1,500', 'Class D Misdemeanor'],
  ['8.03', 'Indecent Exposure', '$2,000', '15 minutes', '1', '$3,000', 'Class D Misdemeanor'],
  ['8.04', 'Prostitution', '$3,000', '20 minutes', '1', '$4,500', 'Class C Misdemeanor'],
  ['9.01', 'Possession of Stolen Property', '$4,000', '25 minutes', '2', '$6,000', 'Class C Felony'],
  ['9.02', 'Money Laundering', '$15,000', '70 minutes', '3', '$22,500', 'Class B Felony'],
  ['9.03', 'Racketeering', '$30,000', '100 minutes', '5', '$45,000', 'Class A Felony'],
  ['9.04', 'Bribery', '$10,000', '50 minutes', '2', '$15,000', 'Class C Felony'],
  ['10.01', 'DUI - First Offense', '$3,000', '20 minutes', '1', '$4,500', 'Class C Misdemeanor'],
  ['10.02', 'DUI - Second Offense', '$6,000', '40 minutes', '2', '$9,000', 'Class C Felony'],
  ['10.03', 'DUI with Injury', '$10,000', '60 minutes', '3', '$15,000', 'Class B Felony'],
  ['10.04', 'Hit and Run', '$7,000', '35 minutes', '2', '$10,000', 'Class C Felony'],
  ['11.01', 'Perjury', '$5,000', '30 minutes', '2', '$7,500', 'Class C Felony'],
  ['11.02', 'Obstruction of Justice', '$8,000', '40 minutes', '3', '$12,000', 'Class B Felony'],
  ['11.03', 'Contempt of Court', '$3,000', '20 minutes', '1', '$4,500', 'Class C Misdemeanor'],
  ['11.04', 'Escape from Custody', '$15,000', '70 minutes', '4', '$22,500', 'Class A Felony'],
];

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(penalCodeData);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Penal Codes');

// Ensure directory exists
const outputDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write to file
const outputPath = path.join(outputDir, 'patrol.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Sample Excel file created at: ${outputPath}`);
