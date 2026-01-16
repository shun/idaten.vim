# Runtime実装

## 責務

- 起動時の即時ロード
- 遅延トリガの処理
- hook 実行

## 起動時処理

1. 全プラグインの `boot_sources` を source
2. 依存解決順（`s:state.order`）に `hook_add` 実行
3. lazy 未指定プラグインを即時ロード（`s:EnsureLoaded()`）
4. event/FileType の autocmd 定義
5. command の stub 定義

## 遅延ロード処理

### トリガ発火時

1. `loaded[name]` を確認
2. 未ロードなら:
   - `dev.enable` が true の場合は `override_path` を使用
   - 依存を先にロード（`s:EnsureLoaded()` 再帰呼び出し）
   - runtimepath を直接更新（`idaten#EnsureRuntimePath()`）
   - `sources` を source
   - `hook_source` を実行
   - `loaded[name] = v:true` を設定

### FileType 時の特殊処理

FileType トリガ時は以下を実行:

1. 該当 FileType のプラグインをロード（`s:state.triggers.ft` から取得）
2. **既にロード済みの全プラグイン**の該当 `ft_sources` も source（`s:SourceFiletypeForLoaded()`）

**理由**: 後から FileType が発火した時に、既存プラグインの ftplugin も適用すべきため。

### command 再実行

stub コマンドが呼ばれたら:

1. `s:command_running` でガード（無限ループ防止）
2. プラグインをロード（`s:LoadCommandPlugins()`）
3. 元のコマンドを再構築して実行（`s:BuildCommand()`）

再構築時に保持する情報:
- `mods`（`silent`/`keepjumps` 等）
- `range`（`line1,line2`）
- `count`
- `bang`（`!`）
- `register`
- `q-args`（生文字列）

`range` が指定されている場合は `count` より優先します。

stub コマンド定義: `-nargs=* -range -count -bang -register -bar`

## dev override

`dev.enable` が true の場合、`override_path` を優先してロード対象にします。

## エラー処理

- 依存解決が失敗した場合は対象プラグインをロードせずに停止
- `s:state.schema` が未知の場合は runtime を停止し、`sync/compile` を案内

## 内部関数

- `s:IsLazy()`: プラグインが lazy かどうか判定
- `s:IsLoaded()`: プラグインがロード済みか確認
- `s:PluginBasePath()`: dev override を考慮したベースパス取得
- `s:PluginRtpPath()`: rtp を考慮した最終パス取得
- `s:SourceFiles()`: ファイル配列を source
- `s:EnsureLoaded()`: プラグインをロード（依存も含む）
- `s:SourceFiletype()`: 特定プラグインの filetype ファイルを source
- `s:SourceFiletypeForLoaded()`: ロード済み全プラグインの filetype ファイルを source
- `s:OnEvent()`: event トリガハンドラ
- `s:OnFileType()`: FileType トリガハンドラ
- `s:LoadCommandPlugins()`: command トリガでプラグインをロード
- `s:BuildCommand()`: コマンドライン再構築
- `s:CommandStub()`: stub コマンドハンドラ
- `s:DefineCommand()`: stub コマンド定義

## ファイル

- `state.vim`: 生成物（`src/state.ts` の `renderRuntimeVim()` で生成）
