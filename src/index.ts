import * as opentype from 'opentype.js';
import { alphabets } from './alphabets';
import { unicodes } from './unicodes';

interface LanguageSupport {
    unicodeRangeSupport: number;
    alphabetSupport: number;
}

class FontPreviewer {
    private currentFont: opentype.Font | null = null;
    
    constructor() {
        // Set up event listeners
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // File drop event
        document.getElementById('dropArea')!.addEventListener('dragover', (e) => e.preventDefault());
        document.getElementById('dropArea')!.addEventListener('drop', this.handleFileDrop.bind(this));
    }
    
    private async handleFileDrop(e: DragEvent): Promise<void> {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || []);
        
        const fontFile = files.find(file => /\.(woff|ttf)$/i.test(file.name));
        
        if (fontFile) {
            await this.loadFont(fontFile);
        }
    }
    
    private async loadFont(fontFile: File): Promise<void> {
        const fontArrayBuffer = await this.readFileAsArrayBuffer(fontFile);
        this.currentFont = opentype.parse(fontArrayBuffer);
        
        this.logFontInfo();
    }
    
    private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    private logFontInfo(): void {
        if (!this.currentFont) return;

        console.log('Font Info:');
        console.log('Name:', this.currentFont.names.fullName.en);
        console.log('Size:', this.currentFont.unitsPerEm);
        
        // Test font condensation
        const avgWidth = this.getAverageCharacterWidth();
        const condensation = avgWidth / this.currentFont.unitsPerEm;
        console.log('Condensation factor:', condensation.toFixed(2));
        
 // Original Unicode range check
 this.checkLanguageSupport();
    }
    private checkLanguageSupport(): void {
        if (!this.currentFont) return;
    
        console.log('Checking language support...');
        
        const unicodeRangeSupport = this.checkLanguageSupportByUnicodeRange();
        const alphabetSupport = this.checkLanguageSupportByAlphabet();
    
        const languageSupport: { [key: string]: LanguageSupport } = {};
    
        for (const lang in unicodeRangeSupport) {
            languageSupport[lang] = {
                unicodeRangeSupport: unicodeRangeSupport[lang],
                alphabetSupport: alphabetSupport[lang] || 0
            };
        }
    
        this.createAndAppendSupportTable(languageSupport);
    }
    private getAverageCharacterWidth(): number {
        if (!this.currentFont) return 0;
        const testChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let totalWidth = 0;
        for (const char of testChars) {
            const glyph = this.currentFont.charToGlyph(char);
            totalWidth += glyph.advanceWidth;
        }
        return totalWidth / testChars.length;
    }

    private checkLanguageSupportByUnicodeRange(): { [key: string]: number } {
        const languageSupport: { [key: string]: number } = {};
    
        for (const [languageName, ranges] of Object.entries(unicodes)) {
            let supportedChars = 0;
            let totalChars = 0;
    
            for (const [start, end] of ranges) {
                for (let charCode = start; charCode <= end; charCode++) {
                    totalChars++;
                    if (this.currentFont.charToGlyphIndex(String.fromCharCode(charCode)) !== 0) {
                        supportedChars++;
                    }
                }
            }
    
            const supportPercentage = (supportedChars / totalChars) * 100;
            languageSupport[languageName] = parseFloat(supportPercentage.toFixed(1));
        }
    
        return languageSupport;
    }
    

    private checkLanguageSupportByAlphabet(): { [key: string]: number } {
        const languageSupport: { [key: string]: number } = {};
    
        for (const [languageName, alphabet] of Object.entries(alphabets)) {
            let supportedChars = 0;
    
            for (const char of alphabet) {
                if (this.currentFont.charToGlyphIndex(char) !== 0) {
                    supportedChars++;
                }
            }
    
            const supportPercentage = (supportedChars / alphabet.length) * 100;
            languageSupport[languageName] = parseFloat(supportPercentage.toFixed(1));
        }
    
        return languageSupport;
    }

    private createAndAppendSupportTable(languageSupport: { [key: string]: LanguageSupport }): void {
        let tableHTML = `
            <table style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th style="border: 1px solid black; padding: 8px;">Language</th>
                    <th style="border: 1px solid black; padding: 8px;">Unicode Range Support</th>
                    <th style="border: 1px solid black; padding: 8px;">Alphabet Support</th>
                </tr>
        `;
    
        for (const [language, support] of Object.entries(languageSupport)) {
            const unicodeColor = this.getColorForPercentage(support.unicodeRangeSupport);
            const alphabetColor = this.getColorForPercentage(support.alphabetSupport);
    
            tableHTML += `
                <tr>
                    <td style="border: 1px solid black; padding: 8px;">${language}</td>
                    <td style="border: 1px solid black; padding: 8px; background-color: ${unicodeColor};">${support.unicodeRangeSupport}%</td>
                    <td style="border: 1px solid black; padding: 8px; background-color: ${alphabetColor};">${support.alphabetSupport}%</td>
                </tr>
            `;
        }
    
        tableHTML += '</table>';
    
        // Append the table to the document
        const tableContainer = document.createElement('div');
        tableContainer.innerHTML = tableHTML;
        document.getElementById('supportContainer')!.appendChild(tableContainer);
    }
    
    private getColorForPercentage(percentage: number): string {
        if (percentage === 100) return '#e6ffe6'; // pale green
        if (percentage >= 80) return '#ffffcc'; // pale yellow
        return '#ffe6e6'; // pale red
    }
}

// Usage
const previewer = new FontPreviewer();
