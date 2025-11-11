import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  // Navigation Elements
  readonly bleepButton: Locator;
  readonly samplerButton: Locator;
  readonly githubLink: Locator;

  // Content Sections
  readonly heroSection: Locator;
  readonly demoVideo: Locator;
  readonly howItWorksSection: Locator;
  readonly privacySection: Locator;
  readonly technologySection: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.bleepButton = page.getByTestId('bleep-button');
    this.samplerButton = page.getByTestId('sampler-button');
    this.githubLink = page.getByTestId('github-link');

    // Content Sections
    this.heroSection = page.getByTestId('hero-section');
    this.demoVideo = page.getByTestId('demo-video');
    this.howItWorksSection = page.getByTestId('how-it-works-section');
    this.privacySection = page.getByTestId('privacy-section');
    this.technologySection = page.getByTestId('technology-section');
  }

  /**
   * Navigate to the Home page
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Navigate to the Bleep page via button
   */
  async goToBleepPage() {
    await this.bleepButton.click();
    await this.page.waitForURL('/bleep');
  }

  /**
   * Navigate to the Sampler page via button
   */
  async goToSamplerPage() {
    await this.samplerButton.click();
    await this.page.waitForURL('/sampler');
  }

  /**
   * Click the GitHub link (opens in new tab)
   */
  async openGitHubRepo() {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.githubLink.click(),
    ]);
    return newPage;
  }

  /**
   * Verify hero section is visible
   */
  async expectHeroVisible() {
    await expect(this.heroSection).toBeVisible();
  }

  /**
   * Verify demo video is visible
   */
  async expectDemoVideoVisible() {
    await expect(this.demoVideo).toBeVisible();
  }

  /**
   * Verify all main sections are visible
   */
  async expectAllSectionsVisible() {
    await expect(this.heroSection).toBeVisible();
    await expect(this.howItWorksSection).toBeVisible();
    await expect(this.privacySection).toBeVisible();
    await expect(this.technologySection).toBeVisible();
  }
}
