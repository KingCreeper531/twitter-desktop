import UIKit

/// Everything that makes this iPhone app Twitter (x.com).
enum Site {
    static let name = "Twitter"
    static let home = URL(string: "https://x.com/home")!
    static let urlScheme = "ranchtw"
    static let repo = "KingCreeper531/twitter-desktop"
    static let background = UIColor.black
    static let userAgent =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
    static let hosts = ["x.com", "twitter.com", "twimg.com", "pscp.tv", "periscope.tv"]

    static func isRedirect(_ url: URL) -> Bool { false }

    /// Removes share-tracking codes. t.co links open in Safari, which follows them.
    static func cleanOutbound(_ url: URL) -> URL {
        guard var c = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return url }
        c.queryItems = c.queryItems?.filter { !["s", "t", "ref_src", "ref_url"].contains($0.name) }
        if c.queryItems?.isEmpty == true { c.queryItems = nil }
        return c.url ?? url
    }
}