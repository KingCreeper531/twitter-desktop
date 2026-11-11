import UIKit
import WebKit

/// The site in a WebView with the app's page script (Web/inject.js, generated from the
/// Windows app's src/preload.js): ad blocking and cleanup, plus a green Update button.
/// Everything specific to the site is in Site.swift.
final class PlayerViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private var web: WKWebView!
    private let updater = Updater()
    private var pendingURL: URL?
    private var ready = false

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Site.background

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.allowsAirPlayForMediaPlayback = true
        config.allowsPictureInPictureMediaPlayback = true

        let content = config.userContentController
        content.add(WeakMessageHandler(self), contentWorld: .page, name: "rw")
        content.addUserScript(WKUserScript(source: Self.pageScript(),
                                           injectionTime: .atDocumentStart,
                                           forMainFrameOnly: true,
                                           in: .page))

        web = WKWebView(frame: .zero, configuration: config)
        web.customUserAgent = Site.userAgent
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.isOpaque = false
        web.backgroundColor = Site.background
        web.scrollView.backgroundColor = Site.background
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        AdBlocker.install(into: content) { [weak self] in
            guard let self else { return }
            self.ready = true
            self.web.load(URLRequest(url: self.pendingURL ?? Site.home))
            self.pendingURL = nil
        }

        updater.onChange = { [weak self] in self?.pushUpdateState() }
        updater.start()
    }

    /// Opened from a link (the Ranch Launcher's scheme, or a link to the site).
    func open(_ url: URL) {
        var target = Site.home
        if url.scheme == Site.urlScheme {
            var c = URLComponents(url: Site.home, resolvingAgainstBaseURL: false)!
            let path = [url.host, url.path].compactMap { $0 }.joined().trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            if !path.isEmpty { c.path = "/" + path; c.query = url.query }
            target = c.url ?? Site.home
        } else if Self.isInternal(url) {
            target = url
        }
        guard ready else { pendingURL = target; return }
        web.load(URLRequest(url: target))
    }

    private static func pageScript() -> String {
        guard let url = Bundle.main.url(forResource: "inject", withExtension: "js"),
              let js = try? String(contentsOf: url, encoding: .utf8) else { return "" }
        return js
    }

    // MARK: - Messages from the page

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        let arg = body["arg"] as? String ?? ""
        switch type {
        case "rw:open-outside":
            if let url = URL(string: arg) { openOutside(url) }
        case "tb:update-install":
            updater.openReleasePage()
        default:
            break
        }
    }

    private func pushUpdateState() {
        let json = updater.stateJSON()
        web?.evaluateJavaScript("window.__rwUpdateState = \(json); window.__rwEmit && window.__rwEmit('tb:update', \(json));")
    }

    // MARK: - Navigation

    static func isInternal(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        if Site.isRedirect(url) { return false }
        return Site.hosts.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    /// Outside links open in Safari, without the site's tracking redirect.
    private func openOutside(_ url: URL) {
        UIApplication.shared.open(Site.cleanOutbound(url))
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { return decisionHandler(.cancel) }
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == "about" || scheme == "blob" || scheme == "data" { return decisionHandler(.allow) }
        if (scheme == "https" || scheme == "http") && Self.isInternal(url) { return decisionHandler(.allow) }
        // Frames inside the page (embeds, sign-in helpers) load normally
        if let frame = navigationAction.targetFrame, !frame.isMainFrame { return decisionHandler(.allow) }
        if scheme == "https" || scheme == "http" { openOutside(url) }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            if Self.isInternal(url) { webView.load(URLRequest(url: url)) } else { openOutside(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pushUpdateState()
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}

/// Avoids a retain cycle between the WebView and its message handler.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}
