import UIKit
import AVFoundation

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    private let player = PlayerViewController()

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Videos play with sound even when the silent switch is on
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [])

        window = UIWindow(frame: UIScreen.main.bounds)
        window?.backgroundColor = Site.background
        window?.rootViewController = player
        window?.makeKeyAndVisible()
        if let url = launchOptions?[.url] as? URL { player.open(url) }
        return true
    }

    /// Links from the Ranch Launcher open here.
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        player.open(url)
        return true
    }
}
