// tracking-analyzer.js
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class Web3TrackingAnalyzer {
    constructor(options = {}) {
        this.options = {
            headless: false,
            timeout: 30000,
            ...options
        };
        this.results = {};
    }

    async analyze(url) {
        console.log(`\nAnalyzing ${url} for tracking implementations...`);
        
        const browser = await chromium.launch({
            headless: this.options.headless
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });

        const page = await context.newPage();
        this.results[url] = {
            url,
            timestamp: new Date().toISOString(),
            trackingScripts: [],
            networkRequests: [],
            cookies: [],
            fingerprinting: {
                canvas: false,
                webgl: false,
                fonts: false,
                audio: false
            },
            walletTracking: {
                detected: false,
                methods: []
            }
        };

        try {
            // Monitor network requests
            await this.setupNetworkMonitoring(page, url);
            
            // Monitor fingerprinting attempts
            await this.setupFingerprintingDetection(page, url);
            
            // Visit the page
            await page.goto(url, {
                timeout: this.options.timeout,
                waitUntil: 'networkidle'
            });

            // Analyze tracking implementations
            await this.analyzeTrackingScripts(page, url);
            await this.analyzeLocalStorage(page, url);
            await this.analyzeCookies(context, url);
            await this.analyzeWalletTracking(page, url);

            // Save screenshot for verification
            await this.saveScreenshot(page, url);

        } catch (error) {
            console.error(`Error analyzing ${url}:`, error);
            this.results[url].errors = [error.message];
        }

        await browser.close();
        await this.saveResults();

        return this.results[url];
    }

    async setupNetworkMonitoring(page, url) {
        await page.route('**/*', async route => {
            const request = route.request();
            const requestUrl = request.url();
            
            // Check for tracking-related requests
            if (this.isTrackingRequest(requestUrl)) {
                this.results[url].networkRequests.push({
                    url: requestUrl,
                    method: request.method(),
                    headers: request.headers(),
                    data: request.postData(),
                    type: this.categorizeRequest(requestUrl)
                });
            }
            
            await route.continue();
        });
    }

    async setupFingerprintingDetection(page, url) {
        await page.evaluate(() => {
            // Monitor Canvas Fingerprinting
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function() {
                window._fingerprinting = window._fingerprinting || {};
                window._fingerprinting.canvas = true;
                return originalToDataURL.apply(this, arguments);
            };

            // Monitor WebGL Fingerprinting
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function() {
                window._fingerprinting = window._fingerprinting || {};
                window._fingerprinting.webgl = true;
                return originalGetParameter.apply(this, arguments);
            };

            // Monitor Audio Fingerprinting
            const originalCreateOscillator = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function() {
                window._fingerprinting = window._fingerprinting || {};
                window._fingerprinting.audio = true;
                return originalCreateOscillator.apply(this, arguments);
            };
        });
    }

    async analyzeTrackingScripts(page, url) {
        const scripts = await page.evaluate(() => {
            return Array.from(document.getElementsByTagName('script'))
                .map(script => ({
                    src: script.src,
                    content: script.innerHTML
                }))
                .filter(script => {
                    const tracking = [
                        'cookie3',
                        'analytics',
                        'tracking',
                        'wallet',
                        'web3'
                    ];
                    return tracking.some(term => 
                        script.src.includes(term) || 
                        script.content.includes(term)
                    );
                });
        });

        this.results[url].trackingScripts = scripts;
    }

    async analyzeLocalStorage(page, url) {
        const storage = await page.evaluate(() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
            }
            return data;
        });

        this.results[url].localStorage = storage;
    }

    async analyzeCookies(context, url) {
        const cookies = await context.cookies();
        this.results[url].cookies = cookies.filter(cookie => 
            this.isTrackingCookie(cookie)
        );
    }

    async analyzeWalletTracking(page, url) {
        const walletTracking = await page.evaluate(() => {
            const results = {
                detected: false,
                methods: []
            };

            // Check for common wallet providers
            if (window.ethereum) {
                results.methods.push('ethereum');
                results.detected = true;
            }

            // Check for wallet tracking code
            const source = document.documentElement.outerHTML;
            const patterns = [
                'accountsChanged',
                'ethereum.on(',
                'wallet.on(',
                'web3'
            ];

            patterns.forEach(pattern => {
                if (source.includes(pattern)) {
                    results.methods.push(pattern);
                    results.detected = true;
                }
            });

            return results;
        });

        this.results[url].walletTracking = walletTracking;
    }

    async saveScreenshot(page, url) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const urlSafe = url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${urlSafe}_${timestamp}.png`;
        const dirPath = path.join(process.cwd(), 'screenshots');
        
        try {
            await fs.mkdir(dirPath, { recursive: true });
            await page.screenshot({
                path: path.join(dirPath, filename),
                fullPage: true
            });
        } catch (error) {
            console.error(`Error saving screenshot:`, error);
        }
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `analysis_results_${timestamp}.json`;
        const dirPath = path.join(process.cwd(), 'results');
        
        try {
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(
                path.join(dirPath, filename),
                JSON.stringify(this.results, null, 2)
            );
        } catch (error) {
            console.error(`Error saving results:`, error);
        }
    }

    isTrackingRequest(url) {
        const trackingPatterns = [
            'cookie3.co',
            'analytics',
            'tracking',
            'collect',
            'wallet'
        ];
        return trackingPatterns.some(pattern => url.includes(pattern));
    }

    categorizeRequest(url) {
        if (url.includes('cookie3.co')) return 'cookie3';
        if (url.includes('analytics')) return 'analytics';
        if (url.includes('tracking')) return 'tracking';
        return 'other';
    }

    isTrackingCookie(cookie) {
        const trackingPatterns = [
            'cookie3',
            'analytics',
            '_ga',
            'track'
        ];
        return trackingPatterns.some(pattern => 
            cookie.name.includes(pattern) || 
            cookie.domain.includes(pattern)
        );
    }

    generateReport() {
        const report = {
            analyzedUrls: Object.keys(this.results).length,
            trackingImplementations: {
                cookie3: 0,
                googleAnalytics: 0,
                customTracking: 0
            },
            fingerprintingDetected: 0,
            walletTrackingDetected: 0,
            details: this.results
        };

        for (const url in this.results) {
            const result = this.results[url];
            if (result.trackingScripts.some(s => s.src.includes('cookie3'))) {
                report.trackingImplementations.cookie3++;
            }
            if (result.fingerprinting.canvas || 
                result.fingerprinting.webgl || 
                result.fingerprinting.audio) {
                report.fingerprintingDetected++;
            }
            if (result.walletTracking.detected) {
                report.walletTrackingDetected++;
            }
        }

        return report;
    }
}

// Usage example
async function analyzeWebsites() {
    const sites = [
        'https://app.uniswap.org',
        'https://polkastarter.com'
    ];

    const analyzer = new Web3TrackingAnalyzer();
    
    for (const site of sites) {
        await analyzer.analyze(site);
    }

    const report = analyzer.generateReport();
    console.log('Analysis Report:', JSON.stringify(report, null, 2));
}

module.exports = Web3TrackingAnalyzer;