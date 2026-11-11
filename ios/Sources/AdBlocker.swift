import WebKit

/// Blocks requests to ad and tracking servers using iOS's built-in content blocker.
enum AdBlocker {
    private static let hosts = [
        "doubleclick.net", "googlesyndication.com", "googleadservices.com", "googletagservices.com",
        "google-analytics.com", "googletagmanager.com", "adservice.google.com", "imasdk.googleapis.com",
        "ads-twitter.com", "ads-api.twitter.com", "static.ads-twitter.com", "analytics.twitter.com",
    ]

    private static func rulesJSON() -> String {
        var rules: [[String: Any]] = []
        for host in hosts {
            let escaped = host.replacingOccurrences(of: ".", with: "\\.")
            rules.append(["trigger": ["url-filter": "^https?://([^/]+\\.)?\(escaped)/"], "action": ["type": "block"]])
        }
        let data = (try? JSONSerialization.data(withJSONObject: rules)) ?? Data("[]".utf8)
        return String(data: data, encoding: .utf8) ?? "[]"
    }

    /// Compiles the rules (cached by iOS after the first launch) and adds them; then calls `done`.
    static func install(into content: WKUserContentController, done: @escaping () -> Void) {
        guard let store = WKContentRuleListStore.default() else { return done() }
        store.compileContentRuleList(forIdentifier: "ranch-ad-servers-v1", encodedContentRuleList: rulesJSON()) { list, _ in
            DispatchQueue.main.async {
                if let list { content.add(list) }
                done()
            }
        }
    }
}
