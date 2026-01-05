import Foundation

struct SiriQueueItem: Codable {
    let action: String
    let amountMl: Double?
    let type: String?
    let bristolScale: Int?
    let state: String?
    let note: String?
    let timestamp: Double
}

enum SiriQueueStore {
    private static let queueKey = "nephtrack.siri.queue"

    private static func loadQueue() -> [SiriQueueItem] {
        let defaults = UserDefaults.standard
        guard let data = defaults.data(forKey: queueKey) else {
            return []
        }
        let decoder = JSONDecoder()
        return (try? decoder.decode([SiriQueueItem].self, from: data)) ?? []
    }

    private static func saveQueue(_ items: [SiriQueueItem]) {
        let encoder = JSONEncoder()
        guard let data = try? encoder.encode(items) else {
            return
        }
        UserDefaults.standard.set(data, forKey: queueKey)
    }

    static func enqueue(_ item: SiriQueueItem) {
        var items = loadQueue()
        items.append(item)
        saveQueue(items)
    }

    static func drain() -> [SiriQueueItem] {
        let items = loadQueue()
        saveQueue([])
        return items
    }
}
