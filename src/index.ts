import * as opentype from 'opentype.js';
import { alphabets } from './alphabets';
import { unicodes } from './unicodes';
import { Glyph, Font } from 'opentype.js';

interface LanguageSupport {
    unicodeRangeSupport: number;
    alphabetSupport: number;
}

// Add this interface after existing interfaces
interface ExtractedFont {
    glyphs: Glyph[];
    originalFont: Font;
}


class FontPreviewer {
    private currentFont: Font | null = null;
    
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

    private getColorForPercentage(percentage: number): string {
        if (percentage === 100) return '#e6ffe6'; // pale green
        if (percentage >= 80) return '#ffffcc'; // pale yellow
        return '#ffe6e6'; // pale red
    }

    private createAndAppendSupportTable(languageSupport: { [key: string]: LanguageSupport }): void {
        let containerHTML = `
            <div class="font-tools">
                <div class="extract-buttons">
                    ${this.createExtractButtons(Object.keys(languageSupport))}
                </div>
                <table style="border-collapse: collapse; width: 100%;">
                    <tr>
                        <th style="border: 1px solid black; padding: 8px;">Language</th>
                        <th style="border: 1px solid black; padding: 8px;">Unicode Range Support</th>
                        <th style="border: 1px solid black; padding: 8px;">Alphabet Support</th>
                        <th style="border: 1px solid black; padding: 8px;">Actions</th>
                    </tr>
        `;

        for (const [language, support] of Object.entries(languageSupport)) {
            const unicodeColor = this.getColorForPercentage(support.unicodeRangeSupport);
            const alphabetColor = this.getColorForPercentage(support.alphabetSupport);

            containerHTML += `
                <tr>
                    <td style="border: 1px solid black; padding: 8px;">${language}</td>
                    <td style="border: 1px solid black; padding: 8px; background-color: ${unicodeColor};">${support.unicodeRangeSupport}%</td>
                    <td style="border: 1px solid black; padding: 8px; background-color: ${alphabetColor};">${support.alphabetSupport}%</td>
                    <td style="border: 1px solid black; padding: 8px;">
                        <button onclick="window.fontPreviewer.extractFontForLanguage('${language}')" 
                                class="extract-btn">
                            Extract ${language}
                        </button>
                    </td>
                </tr>
            `;
        }

        containerHTML += '</table></div>';

        // Append the container to the document
        const container = document.createElement('div');
        container.innerHTML = containerHTML;
        document.getElementById('supportContainer')!.innerHTML = '';
        document.getElementById('supportContainer')!.appendChild(container);
    }

    private createExtractButtons(languages: string[]): string {
        return languages.map(lang => 
            `<button onclick="window.fontPreviewer.extractFontForLanguage('${lang}')" 
                     class="extract-btn">
                Extract ${lang}
            </button>`
        ).join('');
    }

    public async extractFontForLanguage(language: string): Promise<void> {
        if (!this.currentFont) {
            console.error('No font loaded');
            return;
        }

        try {
            // Get necessary symbols for the language
            const neededGlyphs = this.getNeededGlyphsForLanguage(language);
            
            // Create new font with only needed glyphs
            const extractedFont = await this.createExtractedFont(neededGlyphs);
            
            // Generate and download the new font file
            this.downloadExtractedFont(extractedFont, language);
        } catch (error) {
            console.error('Error extracting font:', error);
        }
    }

    private getNeededGlyphsForLanguage(language: string): Set<number> {
        const neededGlyphs = new Set<number>();

        // Add basic Latin characters (always included)
        for (let i = 0x0020; i <= 0x007F; i++) {
            neededGlyphs.add(this.currentFont!.charToGlyphIndex(String.fromCharCode(i)));
        }

        // Add language-specific characters from Unicode ranges
        if (unicodes[language]) {
            for (const [start, end] of unicodes[language]) {
                for (let i = start; i <= end; i++) {
                    const glyphIndex = this.currentFont!.charToGlyphIndex(String.fromCharCode(i));
                    if (glyphIndex !== 0) {
                        neededGlyphs.add(glyphIndex);
                    }
                }
            }
        }

        // Add language-specific characters from alphabet
        if (alphabets[language]) {
            for (const char of alphabets[language]) {
                const glyphIndex = this.currentFont!.charToGlyphIndex(char);
                if (glyphIndex !== 0) {
                    neededGlyphs.add(glyphIndex);
                }
            }
        }

        return neededGlyphs;
    }

    private async createExtractedFont(neededGlyphs: Set<number>): Promise<Font> {
        const notdefGlyph = this.currentFont!.glyphs.get(0);
        const extractedGlyphs: Glyph[] = [notdefGlyph];

        // Add needed glyphs
        neededGlyphs.forEach(glyphIndex => {
            if (glyphIndex !== 0) {
                const glyph = this.currentFont!.glyphs.get(glyphIndex);
                if (glyph) {
                    extractedGlyphs.push(glyph);
                }
            }
        });

        // Create new font
        return new Font({
            familyName: this.currentFont!.names.fontFamily.en + '-Extracted',
            styleName: this.currentFont!.names.fontSubfamily.en,
            unitsPerEm: this.currentFont!.unitsPerEm,
            ascender: this.currentFont!.ascender,
            descender: this.currentFont!.descender,
            glyphs: extractedGlyphs
        });
    }

    private downloadExtractedFont(font: Font, language: string): void {
        const originalName = this.currentFont!.names.fullName.en;
        const newName = `${originalName}-${language}-extracted.ttf`;
        
        // Generate font arrayBuffer
        const arrayBuffer = font.toArrayBuffer();
        
        // Create download link
        const blob = new Blob([arrayBuffer], { type: 'font/ttf' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = newName;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        URL.revokeObjectURL(url);
    }
}

// Usage
(window as any).fontPreviewer = new FontPreviewer();