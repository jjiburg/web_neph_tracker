import AppIntents

@available(iOS 16.0, *)
struct VoiceCommandEntity: AppEntity, Hashable, Identifiable {
    var id: String

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Voice Command")

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(id)")
    }

    static var defaultQuery = VoiceCommandQuery()
}

@available(iOS 16.0, *)
struct VoiceCommandQuery: EntityQuery, EntityStringQuery {
    func entities(for identifiers: [VoiceCommandEntity.ID]) async throws -> [VoiceCommandEntity] {
        identifiers.map { VoiceCommandEntity(id: $0) }
    }

    func suggestedEntities() async throws -> [VoiceCommandEntity] {
        []
    }

    func entities(matching string: String) async throws -> [VoiceCommandEntity] {
        [VoiceCommandEntity(id: string)]
    }
}
