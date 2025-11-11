import { Page, Locator, expect } from '@playwright/test';

export class NavbarComponent {
  readonly page: Page;

  // Navigation Elements
  readonly logo: Locator;
  readonly bleepLink: Locator;
  readonly samplerLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navbar elements
    this.logo = page.getByTestId('navbar-logo');
    this.bleepLink = page.getByTestId('navbar-bleep-link');
    this.samplerLink = page.getByTestId('navbar-sampler-link');
  }

  /**
   * Navigate to home page via logo
   */
  async goToHome() {
    await this.logo.click();
    await this.page.waitForURL('/');
  }

  /**
   * Navigate to Bleep page via navbar
   */
  async goToBleepPage() {
    await this.bleepLink.click();
    await this.page.waitForURL('/bleep');
  }

  /**
   * Navigate to Sampler page via navbar
   */
  async goToSamplerPage() {
    await this.samplerLink.click();
    await this.page.waitForURL('/sampler');
  }

  /**
   * Verify navbar is visible
   */
  async expectNavbarVisible() {
    await expect(this.logo).toBeVisible();
    await expect(this.bleepLink).toBeVisible();
    await expect(this.samplerLink).toBeVisible();
  }

  /**
   * Verify we're on the correct page by checking URL
   */
  async expectCurrentUrl(path: string) {
    await this.page.waitForURL(path);
  }
}
