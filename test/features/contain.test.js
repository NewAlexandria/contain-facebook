describe("Contain", () => {
  let webExtension, background, facebookContainer;

  beforeEach(async () => {
    webExtension = await loadWebExtension();
    background = webExtension.background;
    facebookContainer = webExtension.facebookContainer;
  });

  describe("All requests stripped of fbclid param", () => {
    const responses = {};
    beforeEach(async () => {
    });

    it("should redirect non-Facebook urls with fbclid stripped", async () => {
      await background.browser.tabs._create({url: "https://github.com/?fbclid=123"}, {responses});
      expect(background.browser.tabs.create).to.not.have.been.called;
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result.redirectUrl).to.equal("https://github.com/");
    });

    it("should preserve other url params", async () => {
      await background.browser.tabs._create({url: "https://github.com/mozilla/contain-facebook/issues?q=is%3Aissue+is%3Aopen+track&fbclid=123"}, {responses});
      expect(background.browser.tabs.create).to.not.have.been.called;
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result.redirectUrl).to.equal("https://github.com/mozilla/contain-facebook/issues?q=is%3Aissue+is%3Aopen+track");
    });

    it("should redirect Facebook urls with fbclid stripped", async () => {
      await background.browser.tabs._create({url: "https://www.facebook.com/help/securitynotice?fbclid=123"}, {responses});
      expect(background.browser.tabs.create).to.not.have.been.called;
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result.redirectUrl).to.equal("https://www.facebook.com/help/securitynotice");
    });
  });

  describe("Incoming requests to Facebook Domains outside of Facebook Container", () => {
    const responses = {};
    beforeEach(async () => {
      await background.browser.tabs._create({
        url: "https://www.facebook.com"
      }, {
        responses
      });
    });

    it("should be reopened in Facebook Container", async () => {
      expect(background.browser.tabs.create).to.have.been.calledWithMatch({
        url: "https://www.facebook.com",
        cookieStoreId: facebookContainer.cookieStoreId
      });
    });

    it("should be canceled", async () => {
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result.cancel).to.be.true;
    });
  });

  describe("Incoming requests to Non-Facebook Domains inside Facebook Container", () => {
    const responses = {};
    beforeEach(async () => {
      await background.browser.tabs._create({
        url: "https://example.com",
        cookieStoreId: facebookContainer.cookieStoreId
      }, {
        responses
      });
    });

    it("should be reopened in Default Container", async () => {
      expect(background.browser.tabs.create).to.have.been.calledWithMatch({
        url: "https://example.com",
        cookieStoreId: "firefox-default"
      });
    });

    it("should be canceled", async () => {
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result.cancel).to.be.true;
    });
  });


  describe("Incoming requests that don't start with http", () => {
    const responses = {};
    beforeEach(async () => {
      await background.browser.tabs._create({
        url: "ftp://www.facebook.com"
      }, {
        responses
      });
    });

    it("should be ignored", async () => {
      expect(background.browser.tabs.create).to.not.have.been.called;
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result).to.be.undefined;
    });
  });

  describe("Incoming requests that belong to an incognito tab", () => {
    const responses = {};
    beforeEach(async () => {
      await background.browser.tabs._create({
        url: "https://www.facebook.com",
        incognito: true
      }, {
        responses
      });
    });

    it("should be ignored", async () => {
      expect(background.browser.tabs.create).to.not.have.been.called;
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result).to.be.undefined;
    });
  });


  describe("Incoming requests that don't belong to a tab", () => {
    const responses = {};
    beforeEach(async () => {
      await background.browser.tabs._create({
        url: "https://www.facebook.com",
        id: -1
      }, {
        responses
      });
    });

    it("should be ignored", async () => {
      expect(background.browser.tabs.create).to.not.have.been.called;
      const [promise] = responses.webRequest.onBeforeRequest;
      const result = await promise;
      expect(result).to.be.undefined;
    });
  });
});
