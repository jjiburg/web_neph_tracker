import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext

    @AppStorage("autoBackupEnabled") private var autoBackupEnabled = true
    @AppStorage("lastAutoBackupDay") private var lastAutoBackupDay = ""
    @AppStorage("lastAutoBackupFilename") private var lastAutoBackupFilename = ""

    @State private var exportDocument = BackupDocument()
    @State private var exportFilename = "NephTrack-Backup"
    @State private var isExporting = false
    @State private var isImporting = false
    @State private var replaceOnImport = false
    @State private var statusMessage: String?
    @State private var headerOffset: CGFloat = 0

    var body: some View {
        ZStack {
            LiquidBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Color.clear.frame(height: 60) // Header spacer
                    
                    safetyCard
                    backupCard
                    
                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .coordinateSpace(name: "scroll")
            .onPreferenceChange(ScrollOffsetKey.self) { headerOffset = $0 }
        }
        .overlay(alignment: .top) {
            ScreenHeader(title: "Data Safety", subtitle: "Backup & Restore")
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.ultraThinMaterial.opacity(headerOpacity))
                .blur(radius: headerBlur)
        }
        .fileExporter(
            isPresented: $isExporting,
            document: exportDocument,
            contentType: .json,
            defaultFilename: exportFilename
        ) { result in
            switch result {
            case .success:
                statusMessage = "Backup exported."
            case .failure(let error):
                statusMessage = "Export failed: \(error.localizedDescription)"
            }
        }
        .fileImporter(isPresented: $isImporting, allowedContentTypes: [.json]) { result in
            switch result {
            case .success(let url):
                importBackup(from: url)
            case .failure(let error):
                statusMessage = "Import failed: \(error.localizedDescription)"
            }
        }
    }
    
    private var headerOpacity: Double {
        let offset = -headerOffset
        return min(max(offset / 100, 0), 1)
    }
    
    private var headerBlur: CGFloat {
        let offset = -headerOffset
        return min(max(offset / 20, 0), 20)
    }

    private var safetyCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Text("Active Development")
                    .font(DesignSystem.font(.headline, weight: .bold))
                    .foregroundStyle(.white)

                Text("You are using NephTrack on your iPhone. Keep backups on so data is never lost.")
                    .font(DesignSystem.font(.footnote))
                    .foregroundStyle(.white.opacity(0.8))

                Toggle("Auto-backup daily", isOn: $autoBackupEnabled)
                    .tint(DesignSystem.accent)

                if autoBackupEnabled, !lastAutoBackupFilename.isEmpty {
                    Text("Last auto-backup: \(lastAutoBackupFilename)")
                        .font(DesignSystem.font(.caption, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var backupCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Text("Backup and Restore")
                    .font(DesignSystem.font(.headline, weight: .bold))
                    .foregroundStyle(.white)

                Button {
                    exportBackup()
                } label: {
                    Label("Export Backup", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(LiquidButtonStyle())

                Button {
                    isImporting = true
                } label: {
                    Label("Import Backup", systemImage: "square.and.arrow.down")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(LiquidButtonStyle(color: DesignSystem.accentSecondary))

                Toggle("Replace current data", isOn: $replaceOnImport)
                    .tint(DesignSystem.accent)

                Text("If off, imported entries are added to existing data.")
                    .font(DesignSystem.font(.caption))
                    .foregroundStyle(.secondary)

                if let statusMessage {
                    Text(statusMessage)
                        .font(DesignSystem.font(.footnote, weight: .bold))
                        .foregroundStyle(DesignSystem.accent)
                }
            }
        }
    }

    private func exportBackup() {
        do {
            let data = try BackupManager.exportData(from: modelContext)
            exportDocument = BackupDocument(data: data)
            exportFilename = "NephTrack-Backup-\(DateFormatter.backupFilename.string(from: Date()))"
            isExporting = true
        } catch {
            statusMessage = "Export failed: \(error.localizedDescription)"
        }
    }

    private func importBackup(from url: URL) {
        let access = url.startAccessingSecurityScopedResource()
        defer {
            if access {
                url.stopAccessingSecurityScopedResource()
            }
        }

        do {
            let data = try Data(contentsOf: url)
            try BackupManager.importData(from: data, into: modelContext, replaceExisting: replaceOnImport)
            statusMessage = "Backup imported."
        } catch {
            statusMessage = "Import failed: \(error.localizedDescription)"
        }
    }
}

private extension DateFormatter {
    static let backupFilename: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        return formatter
    }()
}

#Preview {
    NavigationStack {
        SettingsView()
    }
}
