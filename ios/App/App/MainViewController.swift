import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(SiriQueuePlugin())
        bridge?.registerPluginType(SecureStorePlugin.self)
    }
}
