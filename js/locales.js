(function(root){
  'use strict';
  // Korean source copy is the stable key. {0}, {1} are opaque names/numbers, never translated.
  const data=`
설정¦Settings¦設定
설정 닫기¦Close settings¦設定を閉じる
파일 선택¦Choose file¦ファイルを選択
선택된 파일 없음¦No file selected¦ファイルが選択されていません
모델 파일 선택¦Choose model file¦モデルファイルを選択
파일을 선택하세요.¦Select a file.¦ファイルを選択してください。
값을 입력하거나 선택하세요.¦Enter or select a value.¦値を入力または選択してください。
올바른 숫자를 입력하세요.¦Enter a valid number.¦有効な数値を入力してください。
{0} 이상의 값을 입력하세요.¦Enter a value of at least {0}.¦{0}以上の値を入力してください。
{0} 이하의 값을 입력하세요.¦Enter a value no greater than {0}.¦{0}以下の値を入力してください。
입력 간격에 맞는 값을 입력하세요.¦Enter a value matching the allowed step.¦指定された刻みに合う値を入力してください。
요청된 형식으로 입력하세요.¦Use the requested format.¦指定された形式で入力してください。
입력값의 길이를 확인하세요.¦Check the length of the value.¦入力値の長さを確認してください。
{0}을(를) 배치했습니다.¦Placed {0}.¦{0} を配置しました。
분기점 · {0}개 설비¦Junction · {0} equipment items¦分岐点・設備{0}台
설비 ID¦Equipment ID¦設備ID
상위 설비 ID¦Parent equipment ID¦上位設備ID
공간 ID¦Space ID¦空間ID
건물 ID¦Building ID¦建物ID
층 ID¦Floor ID¦フロアID
프로젝트 ID¦Project ID¦プロジェクトID
작업 모드 (작업 중)¦Workspace mode (In progress)¦作業モード（準備中）
화면 테마 (작업 중)¦Theme (In progress)¦画面テーマ（準備中）
언어 선택¦Language¦言語選択
Editor Mode¦Editor Mode¦編集モード
Monitoring Mode¦Monitoring Mode¦モニタリングモード
Light Mode¦Light Mode¦ライトモード
Dark Mode¦Dark Mode¦ダークモード
HIERARCHY¦HIERARCHY¦階層
PROPERTIES¦PROPERTIES¦プロパティ
새 프로젝트¦New project¦新規プロジェクト
프로젝트 열기¦Open project¦プロジェクトを開く
프로젝트 저장¦Save project¦プロジェクトを保存
프로젝트 저장 (Ctrl+S)¦Save project (Ctrl+S)¦プロジェクトを保存 (Ctrl+S)
기본 프로젝트 교체¦Replace default project¦既定プロジェクトを置換
도움말¦Help¦ヘルプ
도움말 닫기¦Close help¦ヘルプを閉じる
사용 도움말¦User guide¦操作ガイド
도움말 목차¦Guide contents¦ガイドの目次
도움말 이미지¦Guide image¦ガイド画像
사용법 내용¦Instructions¦操作説明
보기 모드¦View mode¦表示モード
◇ 3D View¦◇ 3D View¦◇ 3D表示
▦ 평면도¦▦ Plan View¦▦ 平面図
⑂ 계통도¦⑂ System Diagram¦⑂ 系統図
실행 취소¦Undo¦元に戻す
실행 취소 (Ctrl+Z)¦Undo (Ctrl+Z)¦元に戻す (Ctrl+Z)
다시 실행¦Redo¦やり直す
다시 실행 (Ctrl+Shift+Z)¦Redo (Ctrl+Shift+Z)¦やり直す (Ctrl+Shift+Z)
전체 보기¦Fit all¦全体表示
전체 보기 (F)¦Fit all (F)¦全体表示 (F)
빌보드 표시¦Show billboards¦ビルボード表示
빌보드 표시 켜기/끄기¦Show/hide billboards¦ビルボード表示の切り替え
좌측 패널 너비 조절¦Resize left panel¦左パネルの幅を調整
우측 패널 너비 조절¦Resize right panel¦右パネルの幅を調整
드래그하여 너비 조절 · 더블클릭으로 초기화¦Drag to resize · Double-click to reset¦ドラッグで幅を調整・ダブルクリックでリセット
이름 또는 코드 검색¦Search name or code¦名前またはコードで検索
배치된 설비 검색¦Search placed equipment¦配置済み設備を検索
검색창으로 이동: / 키¦Focus search: /¦検索欄へ移動: /
설비 계층¦Equipment hierarchy¦設備階層
배치된 설비 계층¦Placed equipment hierarchy¦配置済み設備の階層
설비 배치 작업 공간¦Equipment layout workspace¦設備配置ワークスペース
공간 이동¦Space navigation¦空間の移動
홈¦Home¦ホーム
뒤로가기¦Back¦戻る
상위 씬으로 이동¦Go to parent space¦上位の空間へ移動
대지¦Site¦敷地
대지 속성¦Site properties¦敷地プロパティ
대지 이름¦Site name¦敷地名
대지 크기¦Site size¦敷地サイズ
대지 면적¦Site area¦敷地面積
크기는 적용을 눌러 변경합니다.¦Click Apply to change the size.¦「適用」を押すとサイズが変わります。
대지 이름을 변경했습니다.¦Site name changed.¦敷地名を変更しました。
대지 정보 편집¦Edit site properties¦敷地情報の編集
좌측 계층에서 대지를 선택하면 우측에 이름과 크기가 표시됩니다. 이름은 Enter로 적용하고, 가로·세로는 적용 버튼으로 변경합니다. 면적은 가로×세로로 계산합니다.¦Select the site in the left hierarchy to view its name and size on the right. Press Enter to apply its name; use Apply for width and depth. Area is calculated as width × depth.¦左の階層で敷地を選択すると、右側に名前とサイズが表示されます。名前はEnter、幅と奥行きは「適用」で変更します。面積は幅×奥行きで計算します。
대지 크기 변경¦Resize site¦敷地サイズを変更
변경¦Change¦変更
확대¦Zoom in¦拡大
축소¦Zoom out¦縮小
3D 설비 배치도¦3D equipment layout¦3D設備配置図
평면 설비 배치도¦Equipment plan view¦設備平面図
설비 정렬¦Align equipment¦設備の整列
수평 정렬¦Align horizontally¦水平方向に整列
수직 정렬¦Align vertically¦垂直方向に整列
수평 정렬 · Z 좌표 맞춤 (같은 공간의 설비 2개 이상)¦Horizontal alignment · Match Z coordinates (2+ items in the same space)¦水平整列・Z座標を揃える（同じ空間の設備2台以上）
수직 정렬 · X 좌표 맞춤 (같은 공간의 설비 2개 이상)¦Vertical alignment · Match X coordinates (2+ items in the same space)¦垂直整列・X座標を揃える（同じ空間の設備2台以上）
설비 라이브러리¦Equipment library¦設備ライブラリ
설비 종류¦Equipment type¦設備の種類
기본 설비¦Built-in equipment¦標準設備
추가 설비¦Custom equipment¦追加設備
건물¦Building¦建物
층¦Floor¦フロア
＋ 에셋 등록¦＋ Register asset¦＋ アセット登録
에셋 등록¦Register asset¦アセット登録
배치할 설비¦Equipment to place¦配置する設備
로컬 작업 공간 · 자동 저장¦Local workspace · Autosave¦ローカル作業領域・自動保存
로컬 작업 공간¦Local workspace¦ローカル作業領域
브라우저에 자동 저장됨¦Autosaved in browser¦ブラウザに自動保存済み
개 설비¦equipment items¦台の設備
1 m 그리드¦1 m grid¦1 mグリッド
{0} m 그리드¦{0} m grid¦{0} mグリッド
설비를 선택하세요¦Select equipment¦設備を選択してください
화면이나 좌측 목록에서 선택하면¦Select in the view or the left panel¦画面または左の一覧で選択すると
위치와 크기를 편집할 수 있습니다.¦to edit its position and size.¦位置とサイズを編集できます。
하단 썸네일에서 설비 선택¦Choose equipment from the thumbnails below¦下部のサムネイルから設備を選択
대지를 클릭하여 배치¦Click the site to place¦敷地をクリックして配置
좌측 목록에서 계층 연결¦Set hierarchy in the left panel¦左の一覧で階層を設定
기본 정보¦General¦基本情報
설비 이름¦Equipment name¦設備名
설비 코드¦Equipment code¦設備コード
연결¦Connect¦接続
위치¦Position¦位置
회전¦Rotation¦回転
회전 °¦Rotation °¦回転 °
90도 회전 (R)¦Rotate 90° (R)¦90°回転 (R)
선택 설비 90° 회전¦Rotate selected equipment 90°¦選択設備を90°回転
클릭하면 90° 회전¦Click to rotate 90°¦クリックで90°回転
설비 크기¦Equipment size¦設備サイズ
비율 고정¦Lock proportions¦縦横比を固定
가로¦Width¦幅
가로 (m)¦Width (m)¦幅 (m)
세로¦Depth¦奥行き
세로 (m)¦Depth (m)¦奥行き (m)
높이¦Height¦高さ
높이 (m)¦Height (m)¦高さ (m)
복제¦Duplicate¦複製
삭제¦Delete¦削除
소속 공간¦Location¦所属空間
전력 연결¦Power connections¦電力接続
상위 연결¦Upstream connections¦上位接続
하위 연결¦Downstream connections¦下位接続
상위 연결 추가¦Add upstream connection¦上位接続を追加
하위 연결 추가¦Add downstream connection¦下位接続を追加
연결 없음¦No connections¦接続なし
계층 연결¦Hierarchy connection¦階層接続
추가 연결¦Additional connection¦追加接続
해제¦Disconnect¦解除
프로젝트 이름¦Project name¦プロジェクト名
프로젝트¦Project¦プロジェクト
프로젝트 정보¦Project information¦プロジェクト情報
도면 이름¦Layout name¦図面名
프로젝트 파일 저장¦Save project file¦プロジェクトファイルを保存
Enter로 적용 · Esc 또는 다른 곳 클릭으로 취소¦Enter to apply · Esc or click elsewhere to cancel¦Enterで適用・Escまたは他の場所をクリックして取消
이름: Enter로 적용 · Esc 또는 다른 곳 클릭으로 취소¦Name: Enter to apply · Esc or click elsewhere to cancel¦名前: Enterで適用・Escまたは他の場所をクリックして取消
위치·회전·크기는 즉시 반영됩니다.¦Position, rotation and size apply immediately.¦位置・回転・サイズは即時反映されます。
화살표: 축 이동 · 사각형: X·Z 동시 이동 · ↻ 90°: 회전¦Arrows: move along an axis · Square: move in X/Z · ↻ 90°: rotate¦矢印: 軸方向へ移動・四角: X/Z同時移動・↻ 90°: 回転
기본 치수는 배치용 예시입니다. 실제 설비 규격에 맞게 변경하세요.¦Default dimensions are examples for layout planning. Adjust to the actual equipment specifications.¦既定の寸法は配置用の例です。実際の設備仕様に合わせて変更してください。
기본 치수는 배치용 예시입니다.¦Default dimensions are examples for layout planning.¦既定の寸法は配置用の例です。
실제 설비 규격에 맞게 조정하세요.¦Adjust to the actual equipment specifications.¦実際の設備仕様に合わせて調整してください。
{0}개 설비 선택됨¦{0} equipment items selected¦設備{0}台を選択中
선택한 설비를 함께 편집합니다. 변경과 삭제는 한 번의 실행 취소로 복원할 수 있습니다.¦Edit selected equipment together. Changes and deletions can be undone in one step.¦選択した設備をまとめて編集します。変更や削除は1回の「元に戻す」で復元できます。
선택 영역의 중심 기준 이동·회전 · 회전은 선택 시작 상태가 0°¦Move/rotate around the selection center · Rotation starts at 0°¦選択範囲の中心を基準に移動・回転（選択開始時が0°）
선택 영역의 크기입니다. 중심점 기준으로 설비 간 간격과 모든 치수를 같은 비율로 조절합니다.¦Selection size. Equipment spacing and all dimensions scale proportionally about the center.¦選択範囲のサイズです。中心を基準に設備間隔と全寸法を同じ比率で調整します。
전력 계통도¦Power System Diagram¦電力系統図
계통도 설비 검색¦Search diagram equipment¦系統図の設備を検索
설비 이름 · 코드 · 공간 검색¦Search name, code or location¦設備名・コード・空間を検索
선택 설비의 직접 연결만¦Direct connections only¦選択設備の直接接続のみ
배치에서 보기 ↗¦Show in layout ↗¦配置で表示 ↗
설비 전력 연결 관계도¦Equipment power connections¦設備の電力接続図
연결 단계 {0}¦Stage {0}¦接続段階 {0}
검색 결과가 없습니다.¦No results found.¦検索結果がありません。
검색 조건에 맞는 설비가 없습니다. 검색어를 바꾸거나 직접 연결 필터를 해제하세요.¦No equipment matches. Change the search or turn off the direct-connections filter.¦条件に一致する設備がありません。検索語を変更するか、直接接続フィルターを解除してください。
등록된 설비가 없습니다. 3D View 또는 평면도에서 설비를 배치하세요.¦No equipment yet. Place equipment in 3D View or Plan View.¦設備がありません。3D表示または平面図で設備を配置してください。
연결 관계¦Connections¦接続関係
연결선¦Connection line¦接続線
연결선 편집¦Edit connections¦接続線の編集
색상¦Color¦色
지름¦Diameter¦直径
지름 (m)¦Diameter (m)¦直径 (m)
포인트¦Point¦ポイント
선분¦Segment¦線分
포인트 최적화¦Optimize points¦ポイントを最適化
최적 경로로 정리¦Optimize route¦経路を最適化
경로 복원¦Reset route¦経路を復元
코너 추가¦Add corner¦コーナーを追加
코너 추가 취소¦Cancel adding corner¦コーナー追加を取消
선분에 포인트 추가¦Add point to segment¦線分にポイントを追加
포인트 삭제¦Delete point¦ポイントを削除
X 좌표¦X coordinate¦X座標
Z 좌표¦Z coordinate¦Z座標
Y 높이 (m)¦Y elevation (m)¦Y高さ (m)
공유 분기점 · 연결된 가지와 함께 이동¦Shared junction · Moves with connected branches¦共有分岐点・接続された分岐と一緒に移動
공통 분기점¦Shared junction¦共通分岐点
분기점¦Junction¦分岐点
포인트 이동¦Move point¦ポイントを移動
포인트 이동 · Alt+클릭: 겹친 설비 선택¦Move point · Alt+click: select overlapping equipment¦ポイント移動・Alt+クリック: 重なった設備を選択
설비 고정점¦Fixed equipment endpoint¦設備の固定端点
선분 이동: 네모 드래그¦Move segment: drag square¦線分移動: 四角をドラッグ
코너 추가: 네모 드래그¦Add corner: drag square¦コーナー追加: 四角をドラッグ
설비 선택¦Select equipment¦設備を選択
{0}축 이동¦Move along {0} axis¦{0}軸方向へ移動
네모 드래그: 코너 추가 · Esc: 취소¦Drag square: add corner · Esc: cancel¦四角をドラッグ: コーナー追加・Esc: 取消
초록 네모를 드래그해 꺾임을 만드세요. Esc: 취소¦Drag the green square to add a bend. Esc: cancel¦緑の四角をドラッグして曲がりを追加。Esc: 取消
화살표: 축 이동 · Y 높이: 속성에서 입력¦Arrows: axis movement · Y elevation: enter in properties¦矢印: 軸移動・Y高さ: プロパティで入力
흰색 포인트 드래그: X·Z 이동 · Shift: 정렬 해제¦Drag white point: move in X/Z · Shift: disable snapping¦白いポイントをドラッグ: X/Z移動・Shift: スナップ解除
중앙 네모 드래그: 선분 이동¦Drag center square: move segment¦中央の四角をドラッグ: 線分移動
중앙 네모 드래그: 선분 이동 · Shift: 정렬 해제¦Drag center square: move segment · Shift: disable snapping¦中央の四角をドラッグ: 線分移動・Shift: スナップ解除
불필요한 포인트 {0}개를 제거했습니다.¦Removed {0} redundant points.¦不要なポイントを{0}個削除しました。
정리할 포인트가 없습니다. 코너·분기점과 되돌아가는 경로는 유지됩니다.¦No redundant points. Corners, junctions and return paths are retained.¦整理するポイントはありません。コーナー・分岐点・折り返す経路は保持されます。
빨강¦Red¦赤
노랑¦Yellow¦黄
초록¦Green¦緑
파랑¦Blue¦青
보라¦Purple¦紫
분홍¦Pink¦ピンク
흰색¦White¦白
회색¦Gray¦灰色
취소¦Cancel¦取消
확인¦OK¦確認
적용¦Apply¦適用
닫기¦Close¦閉じる
닫기 (Esc)¦Close (Esc)¦閉じる (Esc)
연결 추가¦Add connection¦接続を追加
전력 연결 대상 선택¦Select power connection target¦電力接続先を選択
연결 대상 선택 닫기¦Close connection picker¦接続先選択を閉じる
연결할 설비 검색¦Search equipment to connect¦接続する設備を検索
설비 이름, 코드 또는 공간 검색¦Search equipment name, code or location¦設備名・コード・空間を検索
연결 대상 계층¦Connection target hierarchy¦接続先の階層
계층구조·위치·기존 연결을 유지하고 연결을 추가합니다.¦Add a connection while preserving hierarchy, positions and existing connections.¦階層・位置・既存接続を保持して接続を追加します。
계층구조에서 상위 설비를 변경하면 기본 연결도 변경됩니다.¦Changing the parent equipment in the hierarchy changes its default connection.¦階層で上位設備を変更すると、基本接続も変わります。
현재 설비¦Current equipment¦現在の設備
이미 연결됨¦Already connected¦接続済み
순환 연결¦Circular connection¦循環接続
상위 설비: {0}¦Upstream equipment: {0}¦上位設備: {0}
하위 설비: {0}¦Downstream equipment: {0}¦下位設備: {0}
선택한 대상 → {0}¦Selected target → {0}¦選択した対象 → {0}
{0} → 선택한 대상¦{0} → Selected target¦{0} → 選択した対象
{0} 연결 해제¦Disconnect {0}¦{0} の接続を解除
{0} 접기¦Collapse {0}¦{0} を折りたたむ
{0} 펼치기¦Expand {0}¦{0} を展開
프로젝트 접기¦Collapse project¦プロジェクトを折りたたむ
프로젝트 펼치기¦Expand project¦プロジェクトを展開
{0} · 드래그하여 최상위로 이동¦{0} · Drag to move to top level¦{0}・ドラッグで最上位へ移動
{0} · 클릭하여 이동¦{0} · Click to navigate¦{0}・クリックで移動
{0} 배치¦Place {0}¦{0} を配置
{0} 삭제¦Delete {0}¦{0} を削除
{0} 추가 설비 삭제¦Delete custom equipment {0}¦追加設備 {0} を削除
{0} → {1} · 계층 연결¦{0} → {1} · Hierarchy connection¦{0} → {1}・階層接続
{0} → {1} · 추가 연결¦{0} → {1} · Additional connection¦{0} → {1}・追加接続
송전탑¦Transmission tower¦送電鉄塔
수전반¦Incoming switchgear¦受電盤
변압기¦Transformer¦変圧器
저압 배전반¦LV switchboard¦低圧配電盤
분전반¦Distribution board¦分電盤
태양광 패널¦Solar panel array¦太陽光パネル
태양광 패널 2×2¦Solar panel array 2×2¦太陽光パネル 2×2
태양광 패널 3×3¦Solar panel array 3×3¦太陽光パネル 3×3
수전·배전¦Power reception / distribution¦受電・配電
부하·보호¦Loads / protection¦負荷・保護
발전·저장¦Generation / storage¦発電・蓄電
한전 등 외부 전력망과 연결되는 고압·중압 전력 공급을 표현합니다.¦Represents high-/medium-voltage supply from an external grid, such as KEPCO.¦KEPCOなどの外部電力網に接続する高圧・中圧電源を表します。
외부에서 들어오는 전력을 받아 차단·보호하는 설비입니다.¦Receives incoming power and provides switching and protection.¦外部からの電力を受け、遮断・保護を行う設備です。
공급 전압을 설비에 필요한 전압으로 변환합니다.¦Converts the supply voltage to the voltage required by equipment.¦供給電圧を設備に必要な電圧へ変換します。
변압기에서 받은 저압 전력을 여러 계통으로 배분합니다.¦Distributes low-voltage power from a transformer to multiple circuits.¦変圧器からの低圧電力を複数の系統へ分配します。
모터 제어반으로, 모터의 전원 공급·운전·보호를 담당합니다.¦A motor control center handles motor power supply, operation and protection.¦モータの給電・運転・保護を行うモータコントロールセンタです。
조명·콘센트 등 개별 회로로 전력을 분배합니다.¦Distributes power to individual circuits such as lighting and outlets.¦照明やコンセントなどの個別回路へ電力を分配します。
무정전 전원장치로, 정전 시 중요 설비에 전력을 공급합니다.¦An uninterruptible power supply powers critical equipment during outages.¦停電時に重要設備へ給電する無停電電源装置です。
태양광을 이용해 전력을 생산하는 발전 설비입니다.¦Generates electricity from sunlight.¦太陽光を利用して電力を生み出す発電設備です。
에너지 저장장치로, 전력을 저장하고 필요할 때 공급합니다.¦An energy storage system stores electricity and supplies it when needed.¦電力を蓄え、必要に応じて供給するエネルギー貯蔵システムです。
기존 태양광 패널 4개를 가로 2개·세로 2개로 붙인 배열입니다. 하나의 설비로 배치·이동·크기 조절합니다.¦Four solar panels in a 2×2 array. Place, move and resize as one item.¦太陽光パネル4枚の2×2配列です。1台の設備として配置・移動・サイズ変更します。
기존 태양광 패널 9개를 가로 3개·세로 3개로 붙인 배열입니다. 하나의 설비로 배치·이동·크기 조절합니다.¦Nine solar panels in a 3×3 array. Place, move and resize as one item.¦太陽光パネル9枚の3×3配列です。1台の設備として配置・移動・サイズ変更します。
건물 이름¦Building name¦建物名
층 이름¦Floor name¦フロア名
이름¦Name¦名前
건물 크기¦Building size¦建物サイズ
건물 높이¦Building height¦建物の高さ
건물 투명도¦Building opacity¦建物の透明度
0% 불투명 · 100% 완전 투명¦0% opaque · 100% transparent¦0% 不透明・100% 完全透明
건물 중심 기준 · 모든 층을 함께 이동합니다.¦Relative to building center · Moves all floors together.¦建物中心が基準です。全フロアを一緒に移動します。
층 등록·수정¦Add / edit floors¦フロアの登録・編集
층 등록¦Add floors¦フロア登録
층 등록 완료¦Apply floors¦フロア登録を完了
층 등록 취소¦Cancel floor registration¦フロア登録を取消
층 구성¦Floor configuration¦フロア構成
층 수¦Number of floors¦フロア数
지상층¦Above ground¦地上階
지하층¦Basement¦地下階
지상층 수¦Above-ground floors¦地上階数
지하층 수¦Basement floors¦地下階数
옥상¦Roof¦屋上
옥상 사용¦Include roof¦屋上を使用
옥상 바닥 높이¦Roof slab elevation¦屋上床の高さ
1층 기준 높이 · 다른 층과 지하층의 간격을 자동 계산합니다.¦Relative to ground floor · Other floor and basement spacing is calculated automatically.¦1階を基準とした高さです。他の階と地下階の間隔は自動計算されます。
층 간격¦Floor spacing¦フロア間隔
층 높이¦Floor height¦フロアの高さ
층 크기¦Floor size¦フロアサイズ
기본 층¦Default floor¦標準フロア
배치 미리보기¦Layout preview¦配置プレビュー
미리보기 갱신¦Refresh preview¦プレビュー更新
층 삭제¦Delete floor¦フロアを削除
층 연결 해제¦Detach floor¦フロアの所属を解除
이 층에 등록¦Assign to this floor¦このフロアに登録
대지로 이동¦Move to site¦敷地へ移動
대지에 유지¦Keep on site¦敷地に保持
등록 대상 선택됨¦Registration target selected¦登録先を選択済み
층 등록·수정에서 변경할 수 있습니다.¦Change this in Add / edit floors.¦「フロアの登録・編集」で変更できます。
층 등록·수정에서 옥상 바닥 높이를 설정하면 자동 계산됩니다.¦Calculated automatically from the roof elevation in Add / edit floors.¦「フロアの登録・編集」の屋上床高さから自動計算されます。
층과 설비가 배치되는 건물입니다. 층 빌보드를 선택하여 해당 층으로 이동합니다.¦A building containing floors and equipment. Select a floor billboard to enter it.¦フロアと設備を配置する建物です。フロアのビルボードを選択すると、そのフロアへ移動します。
건물 내부의 설비를 배치하는 공간입니다. 이 층에 배치된 설비를 관리합니다.¦A space for equipment within a building. Manage equipment placed on this floor.¦建物内に設備を配置する空間です。このフロアの設備を管理します。
우측 층 등록·수정에서 층을 구성하세요.¦Configure floors using Add / edit floors on the right.¦右側の「フロアの登録・編集」で設定してください。
층을 등록하세요¦Add floors¦フロアを登録してください
첫 번째 오브젝트를 배치해 보세요¦Place your first object¦最初のオブジェクトを配置してください
하단 썸네일에서 설비·건물·층을 선택하세요.¦Choose equipment, a building or a floor from the thumbnails below.¦下部のサムネイルから設備・建物・フロアを選択してください。
하단 썸네일로 설비를 배치하세요.¦Place equipment using the thumbnails below.¦下部のサムネイルから設備を配置してください。
여러 공간 ({0}곳)¦Multiple spaces ({0})¦複数の空間（{0}か所）
높이 최대 {0} m · 건물·층간격 내에서 조절¦Maximum height {0} m · Stay within building and floor spacing¦最大高さ {0} m・建物とフロア間隔内で調整
{0} 층 모델¦{0} floor model¦{0} フロアモデル
{0} 이름¦{0} name¦{0} 名前
{0} 비율 고정¦{0} lock proportions¦{0} 縦横比を固定
{0} 가로¦{0} width¦{0} 幅
{0} 세로¦{0} depth¦{0} 奥行き
{0} 높이¦{0} height¦{0} 高さ
{0}을 등록할 층을 선택하세요. 기존 층이 있으면 대지로 분리하여 보존합니다.¦Select a floor for {0}. An existing floor will be detached to the site and preserved.¦{0} の登録先フロアを選択してください。既存フロアは敷地へ分離して保持します。
에셋 종류¦Asset type¦アセットの種類
영문명 (선택)¦English name (optional)¦英語名（任意）
모델 파일¦Model file¦モデルファイル
등록¦Register¦登録
등록 중…¦Registering…¦登録中…
등록할 설비 미리보기¦Asset preview¦登録する設備のプレビュー
실제 치수 (m) · 피봇은 바닥 중앙에 맞춥니다.¦Actual dimensions (m) · Pivot is aligned to the bottom center.¦実寸 (m)・ピボットは底面中央に合わせます。
GLB 파일을 선택하세요.¦Select a GLB file.¦GLBファイルを選択してください。
모델을 확인하는 중…¦Checking model…¦モデルを確認中…
파일을 다시 선택하세요.¦Select the file again.¦ファイルを選択し直してください。
에셋 등록으로 GLB 설비를 추가하세요.¦Use Register asset to add GLB equipment.¦「アセット登録」でGLB設備を追加してください。
에셋을 삭제할까요?¦Delete this asset?¦このアセットを削除しますか？
에셋 없음¦Missing asset¦アセットなし
이 에셋의 등록 정보가 없습니다. 원래 assets/equipment 폴더를 복원하세요. 배치 정보는 유지됩니다.¦Asset metadata is missing. Restore the original assets/equipment folder. Placement data is retained.¦アセットの登録情報がありません。元のassets/equipmentフォルダを復元してください。配置情報は保持されます。
모델 치수가 편집 범위를 벗어나 조정했습니다. 실제 치수(m)를 확인하세요.¦Model dimensions were adjusted to the allowed range. Check actual dimensions (m).¦モデル寸法を編集可能範囲に調整しました。実寸 (m) を確認してください。
미리보기만 가능합니다. 등록하려면 최신 로컬 서버(npm run dev)를 실행하세요.¦Preview only. Run the latest local server (npm run dev) to register assets.¦プレビューのみ可能です。登録には最新のローカルサーバー (npm run dev) を実行してください。
등록은 새 로컬 서버에서 가능합니다. npm run dev로 실행한 화면을 사용하세요.¦Registration requires the updated local server. Use the page served by npm run dev.¦登録には更新済みのローカルサーバーが必要です。npm run devで開いた画面を使用してください。
미리보기를 표시할 수 없습니다.¦Unable to display preview.¦プレビューを表示できません。
에셋을 등록했습니다.¦Asset registered.¦アセットを登録しました。
현재 프로젝트의 추가 설비 목록에서 삭제합니다.¦Remove from this project's custom equipment list.¦現在のプロジェクトの追加設備一覧から削除します。
원본 파일은 보관됩니다.¦The original file is retained.¦元のファイルは保持されます。
같은 에셋의 배치 오브젝트 {0}개도 함께 삭제됩니다. 하위 층·설비는 보존됩니다.¦Also deletes {0} placed objects using this asset. Child floors and equipment are retained.¦同じアセットを使う配置済みオブジェクト{0}個も削除します。下位のフロア・設備は保持されます。
목록이 변경되었습니다. 닫고 다시 선택하세요.¦The list has changed. Close and select again.¦一覧が変更されました。閉じて選択し直してください。
에셋 파일을 확인하세요: {0}¦Check the asset file: {0}¦アセットファイルを確認してください: {0}
대지 가로¦Site width¦敷地の幅
대지 세로¦Site depth¦敷地の奥行き
대지 중심과 설비 위치는 유지됩니다.¦The site center and equipment positions are retained.¦敷地の中心と設備位置は保持されます。
내보낼 데이터 보기¦View export data¦出力データを表示
기본 프로젝트 파일 내용¦Default project contents¦既定プロジェクトの内容
기본 프로젝트를 덮어쓸까요?¦Overwrite the default project?¦既定プロジェクトを上書きしますか？
덮어쓰기¦Overwrite¦上書き
저장 중…¦Saving…¦保存中…
이전 작업 백업¦Previous work backup¦以前の作業のバックアップ
백업 저장¦Save backup¦バックアップを保存
현재 작업¦Current work¦現在の作業
기본값 갱신 전¦Before default update¦既定値更新前
공유 분기점 변환 전¦Before shared-junction migration¦共有分岐点への変換前
건물·층 구조 변경 전¦Before building/floor migration¦建物・フロア構造変更前
전력 연결 구조 변경 전¦Before power-connection migration¦電力接続構造変更前
변경 직전 자동 보관된 도면입니다. 복구할 시점을 선택해 파일로 저장하세요.¦Layouts automatically backed up before changes. Choose a restore point and save it to a file.¦変更直前に自動保管した図面です。復元時点を選びファイルに保存してください。
GitHub 반영은 별도 푸시가 필요합니다.¦Updating GitHub requires a separate push.¦GitHubへの反映には別途プッシュが必要です。
실행 취소로 되돌릴 수 없습니다.¦This cannot be undone.¦この操作は元に戻せません。
실행 취소로 복구할 수 있습니다.¦You can undo this change.¦「元に戻す」で復元できます。
실행 취소로 복원할 수 있습니다.¦You can undo this change.¦「元に戻す」で復元できます。
실행 취소로 포인트와 색상을 복구할 수 있습니다.¦Undo restores the points and colors.¦「元に戻す」でポイントと色を復元できます。
연결선 선택¦Select connection¦接続線を選択
연결선 속성¦Connection properties¦接続線のプロパティ
선택 선분 색상¦Selected segment color¦選択線分の色
선택 포인트 삭제¦Delete selected point¦選択ポイントを削除
수동 경로와 분기점 위치가 다시 계산됩니다. 전력 연결 관계와 설비 배치는 유지됩니다.¦Manual routes and junction positions are recalculated. Power connections and equipment placement are retained.¦手動経路と分岐点位置を再計算します。電力接続関係と設備配置は保持されます。
색상·지름은 새 경로에 옮기며, 다른 출발 설비의 연결망은 변경하지 않습니다.¦Colors and diameters carry over. Networks from other source equipment are unchanged.¦色と直径を新しい経路に引き継ぎ、他の起点設備の接続網は変更しません。
기존 선분 색상이 사라질 수 있습니다.¦Existing segment colors may be lost.¦既存の線分色が失われる場合があります。
선택한 외부 연결선의 경로를 다시 만듭니다.¦Rebuild the selected external connection route.¦選択した外部接続線の経路を再作成します。
편집 대상: {0} 연결망 전체¦Editing: entire network of {0}¦編集対象: {0} の接続網全体
편집 대상: {0} (층별 외부 연결선)¦Editing: {0} (floor external connection)¦編集対象: {0}（フロア別外部接続線）
편집 대상: {0} (외부 연결선)¦Editing: {0} (external connection)¦編集対象: {0}（外部接続線）
대상: {0} 연결망 전체¦Target: entire network of {0}¦対象: {0} の接続網全体
대상: {0} (선택한 외부 연결선)¦Target: {0} (selected external connection)¦対象: {0}（選択した外部接続線）
대상 구간: {0}¦Target route: {0}¦対象区間: {0}
포인트 {0} / {1}¦Point {0} / {1}¦ポイント {0} / {1}
포인트 {0} / {1} · 설비 고정점 (이동·삭제 불가)¦Point {0} / {1} · Fixed endpoint (cannot move/delete)¦ポイント {0} / {1}・設備固定点（移動・削除不可）
포인트 {0} / {1} · 외부 빌보드 (이동 가능)¦Point {0} / {1} · External billboard (movable)¦ポイント {0} / {1}・外部ビルボード（移動可能）
선분 {0} · 부모 → 자식¦Segment {0} · Parent → child¦線分 {0}・親 → 子
{0} · 설비 {1}개 · 연결선 {2}개¦{0} · {1} equipment items · {2} connections¦{0}・設備{1}台・接続線{2}本
배치 겹침 {0}개 확인¦Check {0} placement overlaps¦配置の重なり{0}件を確認
01 화면 개요¦01 Overview¦01 画面概要
02 시작 순서¦02 Getting started¦02 はじめに
03 프로젝트와 저장¦03 Projects and saving¦03 プロジェクトと保存
04 작업화면과 보기 모드¦04 Workspace and views¦04 作業画面と表示モード
05 에셋과 설비 배치¦05 Assets and placement¦05 アセットと設備配置
06 건물과 층¦06 Buildings and floors¦06 建物とフロア
07 계층과 전력 연결¦07 Hierarchy and power¦07 階層と電力接続
08 연결선 편집¦08 Connection editing¦08 接続線の編集
09 단축키와 문제 해결¦09 Shortcuts and troubleshooting¦09 ショートカットと問題解決
화면 개요¦Overview¦画面概要
시작 순서¦Getting started¦はじめに
프로젝트와 저장¦Projects and saving¦プロジェクトと保存
작업화면과 보기 모드¦Workspace and view modes¦作業画面と表示モード
에셋과 설비 배치¦Assets and equipment placement¦アセットと設備配置
건물과 층¦Buildings and floors¦建物とフロア
계층과 전력 연결¦Hierarchy and power connections¦階層と電力接続
단축키와 문제 해결¦Shortcuts and troubleshooting¦ショートカットと問題解決
대지 위에 건물과 설비를 배치하고, 층별 공간과 전력 연결을 관리하는 편집기입니다.¦Place buildings and equipment on a site and manage floor spaces and power connections.¦敷地に建物や設備を配置し、フロアごとの空間と電力接続を管理するエディターです。
각 항목의 이미지는 실제 화면에서 필요한 부분만 캡처한 예시입니다. 이미지를 클릭하면 크게 볼 수 있습니다. 프로젝트 이름과 수치는 작업에 따라 다릅니다.¦Images are cropped examples from the Korean interface. Click to enlarge. Project names and values vary by project.¦画像は韓国語画面の必要な部分を切り取った例です。クリックで拡大できます。プロジェクト名や数値は作業によって異なります。
상단바¦Top bar¦上部バー
프로젝트를 새로 만들고, 열고, 저장합니다. 기본 프로젝트 교체와 도움말도 여기에 있습니다.¦Create, open and save projects. Replace the default project or open Help here.¦プロジェクトの新規作成・読込・保存、既定プロジェクトの置換、ヘルプを利用できます。
좌측 · HIERARCHY¦Left · HIERARCHY¦左側・階層
프로젝트·대지·건물·층·설비의 계층입니다. 이름이나 코드로 검색하고, 드래그하여 소속을 바꿉니다.¦Hierarchy of projects, sites, buildings, floors and equipment. Search by name/code and drag to change membership.¦プロジェクト・敷地・建物・フロア・設備の階層です。名前やコードで検索し、ドラッグで所属を変更します。
중앙 · 작업 화면¦Center · Workspace¦中央・作業画面
3D View와 평면도로 배치를 확인하고, 계통도로 전력 연결을 확인합니다. 배치 화면의 상단 경로 표시에서 대지·건물·층 사이를 이동합니다.¦Use 3D/Plan View for placement and System Diagram for power connections. Navigate sites, buildings and floors via the path at the top of the layout.¦3D表示・平面図で配置を、系統図で電力接続を確認します。配置画面上部の経路から敷地・建物・フロア間を移動します。
우측 · PROPERTIES¦Right · PROPERTIES¦右側・プロパティ
선택한 객체의 정보를 확인합니다. 수정 가능한 이름·위치·크기와 연결 설정을 변경합니다.¦Inspect the selected object and edit its name, position, size and connections where available.¦選択したオブジェクトの情報を確認し、編集可能な名前・位置・サイズ・接続設定を変更します。
하단 · 에셋 창¦Bottom · Asset tray¦下部・アセット一覧
기본 설비·추가 설비·건물·층 모델을 선택합니다. ‘에셋 등록’으로 GLB 모델을 추가합니다.¦Choose built-in/custom equipment, buildings and floors. Add GLB models with Register asset.¦標準設備・追加設備・建物・フロアモデルを選択します。「アセット登録」でGLBモデルを追加します。
프로젝트를 열거나 새 프로젝트를 만듭니다.¦Open or create a project.¦プロジェクトを開くか、新規作成します。
대지 크기를 정하고, 필요한 건물과 층을 구성합니다.¦Set the site size and configure buildings and floors.¦敷地サイズを設定し、必要な建物とフロアを構成します。
설비를 배치한 뒤 계층과 전력 연결을 설정합니다.¦Place equipment, then configure its hierarchy and power connections.¦設備を配置してから階層と電力接続を設定します。
배치와 연결선을 확인하고¦Check the placement and connections, then¦配置と接続線を確認し、
.fems 파일로 저장¦save as a .fems file¦.femsファイルに保存
합니다.¦.¦します。
새로 만들기 · 열기 · 이름¦New / open / name¦新規作成・読込・名前
새 프로젝트:¦New project:¦新規プロジェクト:
빈 대지로 시작합니다. 현재 프로젝트의 추가 에셋 목록도 초기화됩니다.¦Start with an empty site. The current project's custom asset list is also reset.¦空の敷地から開始します。現在のプロジェクトの追加アセット一覧も初期化されます。
프로젝트 열기:¦Open project:¦プロジェクトを開く:
.fems 파일의 배치·연결·추가 에셋을 불러옵니다.¦Load placement, connections and custom assets from a .fems file.¦.femsファイルから配置・接続・追加アセットを読み込みます。
프로젝트 이름:¦Project name:¦プロジェクト名:
좌측 최상위 항목을 선택하고 우측에서 수정합니다. 저장 파일명과는 별개입니다.¦Select the top item in the left panel and edit it on the right. This is separate from the file name.¦左側の最上位項目を選び、右側で編集します。保存ファイル名とは別です。
파일 저장과 자동 저장¦File saving and autosave¦ファイル保存と自動保存
프로젝트 저장:¦Save project:¦プロジェクトを保存:
도면 상태와 프로젝트에 등록된 추가 에셋을 .fems 파일에 함께 보관합니다.¦Save layout state and registered custom assets together in a .fems file.¦図面の状態と登録済み追加アセットを.femsファイルにまとめて保存します。
자동 저장:¦Autosave:¦自動保存:
현재 브라우저의 같은 접속 주소에서 작업을 복원합니다. 다른 브라우저나 GitHub 페이지로 자동 공유되지는 않습니다.¦Restore work in the same browser at the same address. It is not automatically shared with other browsers or the GitHub page.¦同じブラウザの同じURLで作業を復元します。他のブラウザやGitHubページへ自動共有されません。
다른 PC로 옮기거나 중요한 작업을 보관할 때는 .fems 파일을 저장하세요.¦Save a .fems file to move work to another PC or archive important work.¦他のPCへの移動や重要な作業の保管には.femsファイルを保存してください。
현재 도면과 추가 에셋 목록을 프로젝트의 기본 구성으로 저장합니다. 로컬 서버에서 실행하며, GitHub 반영에는 별도 푸시가 필요합니다.¦Save the current layout and custom assets as the project default. Requires the local server; GitHub updates require a separate push.¦現在の図面と追加アセットをプロジェクトの既定構成として保存します。ローカルサーバーで実行し、GitHub反映には別途プッシュが必要です。
기본값 덮어쓰기는 실행 취소로 되돌릴 수 없습니다. 필요한 현재 작업은 먼저 .fems로 저장하세요. ‘이전 작업 백업’은 과거 변경 직전에 자동 보관된 도면입니다.¦Overwriting defaults cannot be undone. Save needed work as .fems first. Previous work backup contains layouts automatically saved before earlier changes.¦既定値の上書きは元に戻せません。必要な作業は先に.femsで保存してください。「以前の作業のバックアップ」は過去の変更直前に自動保管した図面です。
작업화면 상단에서¦At the top of the workspace, select¦作業画面上部で
3D View · 평면도 · 계통도¦3D View · Plan View · System Diagram¦3D表示・平面図・系統図
를 선택합니다. 같은 프로젝트를 서로 다른 방식으로 보여줍니다.¦to view the same project in different ways.¦を選択します。同じプロジェクトを異なる方法で表示します。
3D View · 입체 배치¦3D View · Spatial layout¦3D表示・立体配置
건물 외형, 층 높이, 설비 크기와 공간 관계를 확인합니다.¦Inspect buildings, floor elevations, equipment sizes and spatial relationships.¦建物外観・フロア高さ・設備サイズ・空間関係を確認します。
평면도 · 위에서 보는 배치¦Plan View · Top-down layout¦平面図・上から見た配置
설비의 X·Z 위치와 간격, 바닥 위 연결선 경로를 확인합니다.¦Inspect X/Z positions, equipment spacing and connection routes on the floor.¦設備のX/Z位置や間隔、床上の接続線経路を確認します。
계통도 · 전력 연결 관계¦System Diagram · Power connections¦系統図・電力接続関係
대지·건물·층 전체의 설비가 어떻게 연결되는지 카드와 화살표로 확인합니다.¦Cards and arrows show equipment connections across sites, buildings and floors.¦敷地・建物・フロア全体の設備接続をカードと矢印で確認します。
3D View 사용법¦Using 3D View¦3D表示の操作
빈 곳을 왼쪽 버튼으로 드래그하면 화면이 이동합니다. 오른쪽 버튼으로 드래그하면 시점이 회전합니다.¦Left-drag empty space to pan. Right-drag to orbit.¦空白を左ドラッグすると移動、右ドラッグすると視点が回転します。
건물을 선택하면 외형이 반투명해지고 층이 표시됩니다. 층 빌보드를 누르면 해당 층으로 진입합니다.¦Select a building to make it translucent and show its floors. Click a floor billboard to enter.¦建物を選択すると外観が半透明になりフロアが表示されます。ビルボードをクリックしてフロアに入ります。
설비를 선택해 우측 정보를 확인하고, 이동 핸들로 위치를 조절합니다. 모델 배치와 연결선 경로 편집도 이 화면에서 합니다.¦Select equipment to inspect it on the right and move it with handles. Place models and edit connection routes in this view.¦設備を選択して右側で情報を確認し、ハンドルで移動します。モデル配置や接続線経路の編集もこの画面で行います。
평면도 사용법¦Using Plan View¦平面図の操作
현재 공간을 위에서 내려다봅니다. 빈 곳을 드래그해 이동하며 화면 회전은 하지 않습니다.¦View the current space from above. Drag empty space to pan; this view does not rotate.¦現在の空間を上から表示します。空白をドラッグして移動し、画面は回転しません。
설비의 가로·세로 범위를 보며 위치와 간격을 맞춥니다. 설비 배치와 연결선 경로 편집도 가능합니다.¦Use equipment footprints to align positions and spacing. Placement and route editing are also available.¦設備の幅・奥行きを見ながら位置や間隔を調整します。設備配置や接続線経路の編集も可能です。
높이와 층 사이의 관계는 3D View로 전환해 확인하세요.¦Switch to 3D View to check heights and relationships between floors.¦高さやフロア間の関係は3D表示で確認してください。
계통도 사용법¦Using System Diagram¦系統図の操作
카드와 연결선 읽기¦Reading cards and connections¦カードと接続線の見方
카드는 실제 위치와 관계없이 연결 단계별로 자동 정렬됩니다. 카드에는 설비 이름, 코드 또는 종류, 소속 공간이 표시됩니다.¦Cards are arranged by connection stage, independently of actual positions. They show equipment name, code/type and location.¦カードは実際の位置に関係なく接続段階ごとに自動整列され、設備名・コードまたは種類・所属空間を表示します。
같은 단계(열)는 같은 카드 색상입니다. 검색·직접 연결 필터를 적용하면 표시되는 단계에 맞춰 색상도 바뀝니다.¦Cards in the same stage (column) share a color. Colors follow the displayed stages after filtering.¦同じ段階（列）のカードは同色です。検索や直接接続フィルター適用後は表示段階に合わせて色も変わります。
계층 기본 연결과 추가 연결은 모두 점선입니다. 연결선 색상은 3D View·평면도의 설정을 따르며, 여러 선분의 색상은 순서와 길이 비율로 표시됩니다.¦Hierarchy and additional connections are dashed. Colors follow 3D/Plan View settings, preserving segment order and length ratios.¦階層接続と追加接続は点線です。色は3D表示・平面図の設定に従い、線分の順序と長さの比率を反映します。
화살표는 등록된 연결 방향입니다. 실시간 전력 흐름이나 전력량을 뜻하지 않습니다. 같은 높이에서 다른 카드가 막지 않으면 직선으로 연결합니다.¦Arrows show registered connection direction, not live power flow or energy. Connections are straight at equal heights if no card blocks them.¦矢印は登録された接続方向を示し、リアルタイムの電力潮流や電力量ではありません。同じ高さでカードが遮らなければ直線で接続します。
설비 찾기와 연결 확인¦Finding equipment and connections¦設備の検索と接続確認
이름·코드·공간으로 검색합니다. 검색 결과에 양쪽 설비가 모두 있을 때 연결선을 표시합니다.¦Search by name, code or location. A connection appears when both endpoints are in the results.¦名前・コード・空間で検索します。両端の設備が検索結果にある場合に接続線を表示します。
카드를 선택하면 테두리와 직접 연결된 선이 강조되고, 관련 없는 카드는 흐려집니다. 우측 패널에서 상위·하위 연결을 관리할 수 있습니다.¦Select a card to highlight it and its direct connections, dimming unrelated cards. Manage upstream/downstream connections in the right panel.¦カードを選択すると枠と直接接続線が強調され、無関係なカードは薄くなります。右パネルで上位・下位接続を管理できます。
‘선택 설비의 직접 연결만’을 켜면 선택한 설비와 바로 연결된 설비만 표시합니다. 빈 곳을 클릭하면 선택이 해제됩니다.¦Direct connections only shows the selected equipment and its immediate neighbors. Click empty space to deselect.¦「選択設備の直接接続のみ」を有効にすると選択設備と隣接設備だけを表示します。空白をクリックすると選択解除します。
‘배치에서 보기’를 누르면 선택한 설비가 있는 3D 공간으로 이동합니다.¦Show in layout opens the 3D space containing the selected equipment.¦「配置で表示」で選択設備がある3D空間へ移動します。
계통도는 연결 관계를 자동 배치하는 화면입니다. 카드 위치를 직접 옮기거나 선을 드래그해 경로를 편집하지 않습니다. 실제 모델 배치와 경로 편집은 3D View·평면도에서 진행하세요.¦The diagram automatically arranges connections. Cards and routes are not edited by dragging. Use 3D/Plan View for model placement and route editing.¦系統図は接続関係を自動配置する画面です。カード位置や経路はドラッグで編集できません。モデル配置と経路編集は3D表示・平面図で行ってください。
세 모드의 공통 화면 조작¦Controls shared by all three views¦3つの表示モードに共通の操作
화면 이동:¦Pan:¦画面移動:
빈 곳을 왼쪽 버튼으로 드래그합니다.¦Left-drag empty space.¦空白を左ボタンでドラッグします。
확대·축소:¦Zoom:¦拡大・縮小:
휠 또는 + / − 버튼을 사용합니다.¦Use the wheel or + / − buttons.¦ホイールまたは + / − ボタンを使用します。
전체 보기:¦Fit all:¦全体表示:
상단 네 모서리 아이콘 또는 F 키를 누릅니다. 계통도에서는 현재 표시된 카드를 화면에 맞춥니다.¦Click the four-corner icon or press F. In the diagram, this fits the visible cards.¦上部の四隅アイコンまたはFキーを押します。系統図では表示中のカードを画面に収めます。
패널 너비:¦Panel width:¦パネル幅:
좌우 경계선을 드래그합니다. 더블클릭하면 초기화됩니다.¦Drag the left/right dividers. Double-click to reset.¦左右の境界線をドラッグします。ダブルクリックで初期化します。
배치 화면의 인디케이터와 빌보드¦Layout indicators and billboards¦配置画面のインジケーターとビルボード
인디케이터:¦Indicator:¦インジケーター:
3D View·평면도 상단에 현재 대지·건물·층 경로를 표시합니다. 이름을 누르면 해당 공간으로 이동합니다.¦The path at the top of 3D/Plan View shows the current site/building/floor. Click a name to navigate.¦3D表示・平面図の上部に現在の敷地・建物・フロアの経路を表示します。名前をクリックして移動します。
대지에서는 홈 아이콘이 표시됩니다. 건물·층에서는 뒤로가기 버튼으로 한 단계 위로 이동합니다.¦The site shows a home icon. In buildings/floors, Back moves up one level.¦敷地ではホームアイコンを表示します。建物・フロアでは「戻る」で1つ上へ移動します。
빌보드:¦Billboard:¦ビルボード:
태그 아이콘(빌보드 표시)으로 설비 빌보드를 켜거나 끕니다. 층 선택용 빌보드는 유지됩니다. 층 설비의 빌보드는 해당 층에 진입해야 표시됩니다.¦Toggle equipment billboards with the tag icon (Show billboards). Floor navigation billboards remain visible. Equipment billboards on a floor appear only after entering it.¦タグアイコン（ビルボード表示）で設備ビルボードを切り替えます。フロア選択用は表示を維持し、フロア内設備のビルボードはそのフロアに入ると表示されます。
모델 등록과 배치¦Registering and placing models¦モデルの登録と配置
‘에셋 등록’에서 종류를 정하고 GLB 파일을 선택합니다. 텍스처가 포함된 25 MB 이하 파일을 사용하세요.¦In Register asset, choose a type and a GLB file. Use files up to 25 MB with embedded textures.¦「アセット登録」で種類とGLBファイルを選択します。テクスチャを含む25 MB以下のファイルを使用してください。
미리보기에서 이름과 실제 크기를 확인한 뒤 등록합니다. 에셋 등록은 로컬 서버에서 가능합니다.¦Check the name and actual dimensions in the preview, then register. Registration requires the local server.¦プレビューで名前と実寸を確認して登録します。登録にはローカルサーバーが必要です。
하단 썸네일을 선택한 뒤 바닥을 클릭하거나, 썸네일을 작업 화면으로 드래그해 배치합니다.¦Select a thumbnail then click the floor, or drag a thumbnail into the workspace.¦下部のサムネイルを選んで床をクリックするか、作業画面へドラッグして配置します。
층 안에 배치하려면 먼저 해당 층으로 진입하세요. Esc 키로 배치 모드를 종료합니다.¦Enter a floor before placing equipment there. Press Esc to exit placement mode.¦フロア内に配置する場合は先にそのフロアへ入ります。Escで配置モードを終了します。
선택과 수정¦Selection and editing¦選択と編集
설비나 빌보드를 클릭하면 우측에 정보가 표시됩니다. 좌측 목록에서도 선택할 수 있습니다.¦Click equipment or a billboard to view its properties on the right. You can also select it in the left list.¦設備やビルボードをクリックすると右側に情報が表示されます。左の一覧でも選択できます。
작업창이나 좌측 목록에서 Ctrl(⌘)+클릭으로 여러 설비를 선택합니다. 좌측 목록에서는 Shift 클릭으로 범위를 선택할 수도 있습니다.¦Ctrl(⌘)+click to select multiple items in the workspace or left list. Shift+click selects a range in the list.¦作業画面や左の一覧でCtrl(⌘)+クリックすると複数選択できます。左の一覧ではShift+クリックで範囲選択も可能です。
여러 설비를 선택하면 공통 중심에 기즈모가 나타납니다. X·Z 화살표나 중앙 사각형으로 함께 이동하고, ↻ 90° 버튼으로 중심을 기준으로 회전합니다. 드래그 중 Esc로 취소할 수 있습니다.¦Multi-selection shows a gizmo at the shared center. Move with the X/Z arrows or center square, rotate with ↻ 90°, and press Esc during a drag to cancel.¦複数選択すると共通中心にギズモが表示されます。X/Z矢印や中央の四角で移動し、↻ 90°で中心回転します。ドラッグ中はEscで取消できます。
같은 공간의 설비를 2개 이상 선택하면 작업창 우측 상단의 정렬 버튼이 활성화됩니다. 수평은 Z 좌표, 수직은 X 좌표를 선택 설비들의 중심에 맞춥니다. 정렬 후 겹침을 확인하세요. 계통도에서는 사용할 수 없습니다.¦Select at least two items in one space to enable alignment. Horizontal aligns Z, vertical aligns X to the selection center. Check overlaps afterward. Unavailable in the diagram.¦同じ空間の設備を2台以上選択すると整列ボタンが有効になります。水平はZ座標、垂直はX座標を選択中心へ揃えます。重なりを確認してください。系統図では使用できません。
선택 표시의 화살표는 한 축 이동, 사각형은 X·Z 동시 이동입니다. 회전 버튼은 90°씩 돌립니다.¦Arrows move along one axis; the square moves in X/Z. The rotation button turns by 90°.¦矢印は1軸移動、四角はX/Z同時移動です。回転ボタンは90°ずつ回転します。
숫자를 직접 입력하거나 입력칸 옆 ↔ 핸들을 드래그합니다. ‘비율 고정’을 켜면 크기 비율을 유지합니다.¦Enter numbers or drag the ↔ handle beside an input. Lock proportions keeps the size ratio.¦数値を入力するか入力欄横の↔をドラッグします。「縦横比を固定」でサイズ比率を維持します。
이름은 Enter로 적용합니다. 위치·회전·크기는 즉시 반영됩니다. ‘복제’와 ‘삭제’는 우측 패널에서 실행합니다.¦Press Enter to apply names. Position, rotation and size apply immediately. Duplicate and Delete are in the right panel.¦名前はEnterで適用し、位置・回転・サイズは即時反映されます。複製・削除は右パネルで行います。
건물 배치와 층 등록¦Buildings and floor registration¦建物配置とフロア登録
건물 에셋을 대지에 배치하고 위치·회전·크기를 정합니다.¦Place a building on the site and set its position, rotation and size.¦建物を敷地に配置し、位置・回転・サイズを設定します。
층이 등록된 건물은 크기를 바꿀 수 없습니다.¦Buildings with registered floors cannot be resized.¦フロア登録済みの建物はサイズを変更できません。
건물을 선택하고 ‘층 등록·수정’을 엽니다. 지상층 수와 지하층 수를 입력합니다.¦Select a building and open Add / edit floors. Enter above-ground and basement floor counts.¦建物を選択して「フロアの登録・編集」を開き、地上・地下の階数を入力します。
‘옥상 사용’을 켜면 지상층의 맨 위층이 옥상이 됩니다. 예: 지상 4층이면 4층이 옥상입니다.¦Include roof makes the top above-ground level the roof. For example, with four levels, level 4 is the roof.¦「屋上を使用」で最上階が屋上になります。例: 地上4階なら4階が屋上です。
각 층의 이름과 모델을 지정합니다. ‘기본 층’을 쓰거나, 하단 층 탭에 미리 등록한 에셋을 선택합니다.¦Set each floor's name and model. Use Default floor or a previously registered floor asset.¦各フロアの名前とモデルを設定します。標準フロアまたは登録済みフロアアセットを選択します。
전체 층의 X·Z 위치와 각 층 크기를 조절합니다. 크기는 건물 범위와 층 간격 안에서 제한됩니다.¦Adjust the shared X/Z position and each floor's size, within the building and floor-spacing limits.¦全フロアのX/Z位置と各フロアのサイズを調整します。建物範囲とフロア間隔によって制限されます。
옥상 바닥 높이를 조절하면 다른 층 간격이 자동 계산됩니다. 미리보기의 ‘건물 투명도’로 외형을 비교하세요.¦Changing roof slab elevation recalculates other floor spacing. Use Building opacity in the preview to compare the exterior.¦屋上床の高さを変えると他のフロア間隔を自動計算します。プレビューの「建物の透明度」で外観を比較してください。
‘층 등록 완료’를 눌러 적용합니다. ‘취소’하면 등록 창의 변경을 취소합니다.¦Apply floors confirms the changes. Cancel discards changes in this dialog.¦「フロア登録を完了」で適用します。「取消」でこの画面の変更を破棄します。
건물 보기와 층 진입¦Viewing buildings and entering floors¦建物表示とフロアへの移動
건물을 선택하면 외형이 반투명해지고 등록된 층이 표시됩니다.¦Selecting a building makes it translucent and shows registered floors.¦建物を選択すると外観が半透明になり、登録済みフロアが表示されます。
층 빌보드를 클릭하면 해당 층으로 진입합니다.¦Click a floor billboard to enter that floor.¦フロアのビルボードをクリックすると、そのフロアへ入ります。
건물 빌보드는 파란색, 층 빌보드는 보라색입니다. 층 설비의 빌보드는 해당 층에 들어가야 표시됩니다.¦Building billboards are blue and floor billboards purple. Equipment billboards appear when you enter their floor.¦建物のビルボードは青、フロアは紫です。フロア内設備のビルボードはそのフロアに入ると表示されます。
층 정보 패널은 조회와 삭제에 사용합니다. 이름·모델·크기 등은 건물의 ‘층 등록·수정’에서 바꿉니다.¦The floor properties panel is for inspection and deletion. Change names, models and sizes in the building's Add / edit floors dialog.¦フロア情報パネルでは確認と削除を行います。名前・モデル・サイズは建物の「フロアの登録・編集」で変更します。
층을 삭제하면 그 층의 설비도 함께 삭제되고 층 간격이 다시 계산됩니다. 확인 팝업의 내용을 확인하세요.¦Deleting a floor also deletes its equipment and recalculates floor spacing. Review the confirmation dialog.¦フロアを削除するとその設備も削除され、間隔が再計算されます。確認ダイアログを確認してください。
계층으로 만드는 기본 연결¦Default connections from hierarchy¦階層による基本接続
좌측 목록에서 설비를 다른 설비 아래로 드래그하면 상하위 관계가 생기고 연결선이 자동 생성됩니다. 층 또는 다른 층의 설비 아래로 옮기면 소속 공간도 함께 이동합니다.¦Drag equipment under another item in the left list to establish hierarchy and create a connection. Moving under a floor or its equipment also changes location.¦左の一覧で他の設備の下へドラッグすると上下関係と接続線が作成されます。別フロアやその設備の下へ移すと所属空間も変わります。
위치를 유지하는 추가 연결¦Additional connections without moving equipment¦位置を保持する追加接続
상위 연결 추가:¦Add upstream connection:¦上位接続を追加:
선택한 대상 → 현재 설비 방향으로 연결합니다.¦Connect from the selected target to the current equipment.¦選択した対象から現在の設備へ接続します。
하위 연결 추가:¦Add downstream connection:¦下位接続を追加:
현재 설비 → 선택한 대상 방향으로 연결합니다.¦Connect from the current equipment to the selected target.¦現在の設備から選択した対象へ接続します。
다른 층·대지·다른 건물의 설비도 검색해 선택할 수 있습니다. 추가 연결은 기존 계층과 위치를 유지합니다.¦You can select equipment on other floors/sites/buildings. Additional connections preserve hierarchy and positions.¦他のフロア・敷地・建物の設備も選択できます。追加接続は既存の階層と位置を保持します。
추가 연결은 ‘해제’로 제거합니다. ‘계층 연결’은 좌측 계층에서 상위 설비를 바꿔야 변경됩니다.¦Remove additional connections with Disconnect. Change a hierarchy connection by changing the parent in the left hierarchy.¦追加接続は「解除」で削除します。階層接続は左の階層で上位設備を変更します。
다른 공간과 연결된 경우¦Connections to other spaces¦他の空間への接続
층 내부에서는 연결선이 층 바깥으로 뻗고, 끝에 대상 설비의 빌보드가 표시됩니다. 빌보드를 클릭하면 대상 설비의 공간으로 이동합니다.¦Inside a floor, external connections extend beyond the floor to a target billboard. Click it to navigate to that equipment's space.¦フロア内では接続線が外へ延び、先端に接続先設備のビルボードが表示されます。クリックでその空間へ移動します。
3D View 또는 평면도에서 실제 연결선 경로를 편집합니다.¦Edit actual connection routes in 3D View or Plan View.¦実際の接続線経路は3D表示または平面図で編集します。
연결선을 선택하면 우측에 편집 항목이 표시됩니다. 지름과 선택 선분의 색상을 조절할 수 있습니다.¦Select a connection to show its controls on the right. Adjust diameter and selected segment color.¦接続線を選択すると右側に編集項目が表示され、直径と選択線分の色を調整できます。
포인트나 선분의 조작 핸들을 드래그해 경로를 바꿉니다. Shift를 누르면 자동 정렬을 해제합니다.¦Drag point/segment handles to edit a route. Hold Shift to disable snapping.¦ポイントや線分のハンドルをドラッグして経路を変更します。Shiftでスナップを解除します。
‘코너 추가’ 또는 ‘선분에 포인트 추가’로 꺾임을 만듭니다. 설비에 고정된 끝점은 이동·삭제할 수 없습니다.¦Use Add corner or Add point to segment to create bends. Fixed equipment endpoints cannot be moved or deleted.¦「コーナーを追加」または「線分にポイントを追加」で曲がりを作ります。設備の固定端点は移動・削除できません。
포인트 최적화:¦Optimize points:¦ポイントを最適化:
불필요한 포인트를 정리합니다. 합쳐지는 구간의 색상이 달라질 수 있습니다.¦Remove redundant points. Colors of merged segments may change.¦不要なポイントを整理します。統合された区間の色が変わる場合があります。
최적 경로로 정리:¦Optimize route:¦経路を最適化:
설비와 다른 연결선을 고려해 경로를 다시 만듭니다. 수동 경로가 바뀌므로 팝업의 적용 범위를 확인하세요.¦Rebuild routes considering equipment and other connections. Check the scope in the dialog, as manual routes will change.¦設備や他の接続線を考慮して経路を再作成します。手動経路が変わるため、ダイアログの適用範囲を確認してください。
경로 편집은 실행 취소·다시 실행으로 되돌리거나 재적용할 수 있습니다.¦Route edits support Undo and Redo.¦経路編集は「元に戻す」「やり直す」に対応しています。
전체 보기 / 선택 객체 90° 회전¦Fit all / Rotate selection 90°¦全体表示 / 選択対象を90°回転
선택 객체 삭제 / 계층 검색¦Delete selection / Search hierarchy¦選択対象を削除 / 階層を検索
진행 중 조작 취소 또는 팝업 닫기¦Cancel current operation or close dialog¦操作の取消またはダイアログを閉じる
텍스트 입력 중에는 일부 편집 단축키가 작동하지 않습니다. 도움말을 연 동안 작업 화면의 단축키는 멈춥니다.¦Some editing shortcuts are disabled while typing. Workspace shortcuts are paused while Help is open.¦文字入力中は一部の編集ショートカットが無効になります。ヘルプ表示中は作業画面のショートカットが停止します。
저장이나 에셋 등록이 안 될 때¦When saving or registration fails¦保存やアセット登録ができない場合
오류 문구를 먼저 확인하세요. 서버를 다시 실행해야 한다면 기존 서버를 종료한 뒤 프로젝트 폴더에서¦Check the error first. If restarting the server, stop the old server and, in the project folder, run¦まずエラーを確認してください。サーバーの再起動が必要なら既存サーバーを終了し、プロジェクトフォルダで
를 실행합니다. GitHub 페이지에서는 로컬 파일을 직접 덮어쓸 수 없습니다.¦. The GitHub page cannot overwrite local files directly.¦を実行します。GitHubページではローカルファイルを直接上書きできません。
다른 브라우저에서 작업이 다르게 보일 때¦When work differs between browsers¦ブラウザによって作業内容が異なる場合
자동 저장은 접속 주소와 브라우저마다 다릅니다. 작업을 .fems로 저장하고 원하는 브라우저에서 열어주세요.¦Autosave is specific to the address and browser. Save as .fems and open it in the desired browser.¦自動保存はURLとブラウザごとに異なります。.femsに保存し、使用するブラウザで開いてください。
목차를 선택하면 해당 설명으로 이동합니다.¦Select a topic to jump to its instructions.¦目次を選ぶと該当する説明へ移動します。
확대 보기 ↗¦Enlarge ↗¦拡大表示 ↗
확대 이미지 닫기¦Close enlarged image¦拡大画像を閉じる
확대 이미지 보기¦Enlarged image¦拡大画像
25 MB 이하의 GLB 파일을 선택하세요.¦Choose a GLB file up to 25 MB.¦25 MB以下のGLBファイルを選択してください。
256 MB 이하의 프로젝트를 선택하세요.¦Choose a project up to 256 MB.¦256 MB以下のプロジェクトを選択してください。
3D 그래픽을 사용할 수 없습니다. 기존 설비는 좌측 계층에서 선택해 편집할 수 있습니다.¦3D graphics are unavailable. Select existing equipment in the left hierarchy to edit it.¦3Dグラフィックスを使用できません。既存設備は左の階層で選択して編集できます。
3D 화면을 시작할 수 없습니다. WebGL 2를 지원하는 Edge 또는 Chrome에서 그래픽 가속을 확인하세요. 설비 목록과 속성 편집·파일 저장은 계속 사용할 수 있습니다.¦Unable to start 3D. Check graphics acceleration in Edge or Chrome with WebGL 2. Equipment lists, properties and saving remain available.¦3Dを開始できません。WebGL 2対応のEdgeまたはChromeでグラフィックアクセラレーションを確認してください。一覧・プロパティ編集・保存は引き続き使用できます。
90° 회전했습니다.¦Rotated 90°.¦90°回転しました。
{0}: 1~80자로 입력하세요.¦{0}: enter 1–80 characters.¦{0}: 1～80文字で入力してください。
{0}: 건물 크기를 초과했습니다.¦{0}: exceeds the building size.¦{0}: 建物サイズを超えています。
{0}: 겹치지 않는 경로를 만들 공간이 부족합니다. 설비 간격을 넓힌 뒤 다시 시도해 주세요.¦{0}: not enough space for a non-overlapping route. Increase equipment spacing and retry.¦{0}: 重ならない経路を作る空間が不足しています。設備間隔を広げて再試行してください。
{0}: 다른 층과 겹치거나 건물 높이를 초과했습니다.¦{0}: overlaps another floor or exceeds the building height.¦{0}: 他のフロアと重なるか建物の高さを超えています。
{0}: 대지 영역 밖¦{0}: outside the site¦{0}: 敷地範囲外
{0}: 층 영역 밖¦{0}: outside the floor¦{0}: フロア範囲外
{0}: 모델 파일이 변경되었습니다.¦{0}: model file has changed.¦{0}: モデルファイルが変更されました。
{0}: 에셋 원본이 다릅니다.¦{0}: asset source differs.¦{0}: アセットの原本が異なります。
{0}: 에셋 원본이 다릅니다. 프로젝트 파일을 다시 열어주세요.¦{0}: asset source differs. Reopen the project file.¦{0}: アセットの原本が異なります。プロジェクトを開き直してください。
{0}: 에셋 원본이 없습니다.¦{0}: asset source is missing.¦{0}: アセットの原本がありません。
{0}: 에셋 파일을 찾을 수 없습니다.¦{0}: asset file not found.¦{0}: アセットファイルが見つかりません。
{0}: 추가 에셋 원본이 없습니다. 원본 프로젝트에서 다시 저장하세요.¦{0}: custom asset source is missing. Save again from the original project.¦{0}: 追加アセットの原本がありません。元のプロジェクトから再度保存してください。
Draco·Meshopt·KTX2 압축을 끄고 GLB로 다시 내보내세요.¦Disable Draco/Meshopt/KTX2 compression and export as GLB again.¦Draco・Meshopt・KTX2圧縮を無効にしてGLBで再出力してください。
FEMS v1~v4 프로젝트(.fems)만 열 수 있습니다. WMS 도면은 호환되지 않습니다.¦Only FEMS v1–v4 projects (.fems) are supported. WMS layouts are not compatible.¦FEMS v1～v4プロジェクト (.fems) のみ対応しています。WMS図面との互換性はありません。
FEMS 프로젝트 (도면 + 추가 에셋)¦FEMS project (layout + custom assets)¦FEMSプロジェクト（図面＋追加アセット）
GLB JSON 구조가 올바르지 않습니다.¦Invalid GLB JSON structure.¦GLBのJSON構造が不正です。
GLB 내부 버퍼가 누락되었습니다.¦Missing internal GLB buffer.¦GLB内部バッファがありません。
GLB 데이터 길이가 올바르지 않습니다.¦Invalid GLB data length.¦GLBデータ長が不正です。
GLB 데이터가 잘렸습니다.¦GLB data is truncated.¦GLBデータが切り詰められています。
PNG 또는 JPEG 텍스처를 GLB 안에 포함하세요.¦Embed PNG or JPEG textures in the GLB.¦PNGまたはJPEGテクスチャをGLBに埋め込んでください。
가로·세로·높이가 있는 입체 설비 모델이 필요합니다.¦A 3D equipment model with width, depth and height is required.¦幅・奥行き・高さのある立体設備モデルが必要です。
같은 건물에 층 번호가 중복되었습니다.¦Duplicate floor numbers in the same building.¦同じ建物でフロア番号が重複しています。
같은 공간의 설비끼리 다중 선택하세요.¦Select equipment within the same space.¦同じ空間の設備を複数選択してください。
같은 공간의 설비끼리 정렬하세요.¦Align equipment within the same space.¦同じ空間の設備を整列してください。
같은 단계의 이동 기준 설비를 찾을 수 없습니다.¦Reference equipment at the same hierarchy level was not found.¦同じ階層の移動基準設備が見つかりません。
같은 층을 여러 슬롯에 사용할 수 없습니다.¦A floor cannot occupy multiple slots.¦同じフロアを複数のスロットに使用できません。
건물 GLB가 필요합니다.¦A building GLB is required.¦建物のGLBが必要です。
건물·층 GLB 에셋이 올바르지 않습니다.¦Invalid building/floor GLB asset.¦建物・フロアのGLBアセットが不正です。
건물과 층은 각각 최대 300개입니다.¦Up to 300 buildings and 300 floors are supported.¦建物とフロアはそれぞれ最大300個です。
건물과 층은 하나씩 이동하세요.¦Move buildings and floors one at a time.¦建物とフロアは1つずつ移動してください。
건물은 대지에 배치하세요.¦Place buildings on the site.¦建物は敷地に配置してください。
건물을 찾을 수 없습니다.¦Building not found.¦建物が見つかりません。
경로 계산 대상이 너무 복잡합니다. 연결망을 나누거나 일부 경로를 직접 편집해 주세요.¦Routing is too complex. Split the network or edit some routes manually.¦経路計算が複雑すぎます。接続網を分割するか一部の経路を手動編集してください。
계층 기본 연결입니다. 계층구조에서 상위 설비를 변경하세요.¦This is a hierarchy connection. Change the parent equipment in the hierarchy.¦階層の基本接続です。階層で上位設備を変更してください。
공간 ID가 중복되었습니다.¦Duplicate space IDs.¦空間IDが重複しています。
공간 구조 변환을 완료하지 못해 원본을 유지합니다. 자동 저장을 중지했습니다.¦Space migration failed. The original is retained and autosave is paused.¦空間構造の変換に失敗したため原本を保持し、自動保存を停止しました。
공유 분기점 변환을 완료하지 못해 원본을 유지합니다.¦Shared-junction migration failed. The original is retained.¦共有分岐点への変換に失敗したため原本を保持します。
공유 분기점은 이동할 수 있지만 삭제할 수 없습니다.¦Shared junctions can be moved but not deleted.¦共有分岐点は移動できますが削除できません。
기본 설비는 사용할 수 있습니다.¦Built-in equipment is available.¦標準設備は使用できます。
기본 프로젝트 갱신을 저장하지 못해 현재 작업을 유지합니다. 자동 저장을 중지했습니다.¦Unable to save the default update. Current work is retained and autosave is paused.¦既定プロジェクトの更新を保存できません。現在の作業を保持し、自動保存を停止しました。
기본 프로젝트 저장 기능을 찾지 못했습니다. 로컬 서버를 다시 시작하세요.¦Default-project saving is unavailable. Restart the local server.¦既定プロジェクトの保存機能がありません。ローカルサーバーを再起動してください。
기본 프로젝트를 저장하지 못했습니다.¦Unable to save the default project.¦既定プロジェクトを保存できませんでした。
기존 JSON 도면은 2 MB 이하만 지원합니다.¦Legacy JSON layouts must be no larger than 2 MB.¦旧JSON図面は2 MB以下のみ対応します。
기존 건물에서 연결을 해제한 뒤 등록하세요.¦Detach from the existing building before registering.¦現在の建物から所属を解除してから登録してください。
기존 도면을 백업하고 공유 분기점 구조로 변환했습니다.¦Backed up the layout and converted it to shared junctions.¦図面をバックアップし、共有分岐点構造に変換しました。
남은 층의 번호와 층 간격이 자동으로 조절됩니다.¦Remaining floor numbers and spacing are adjusted automatically.¦残りのフロア番号と間隔は自動調整されます。
옥상 높이는 유지되며, 지상에 옥상만 남으면 1층으로 변경됩니다.¦Roof elevation is retained. If only the roof remains above ground, it becomes floor 1.¦屋上の高さは保持されます。地上に屋上のみが残る場合は1階になります。
남은 층의 크기가 재계산된 층 간격을 초과합니다. 층 등록·수정에서 크기를 조정한 뒤 삭제하세요.¦Remaining floors exceed the recalculated spacing. Resize them in Add / edit floors before deleting.¦残りのフロアが再計算後の間隔を超えます。「フロアの登録・編集」でサイズ調整後に削除してください。
다른 건물에 등록된 층입니다. 먼저 연결을 해제하세요.¦This floor belongs to another building. Detach it first.¦別の建物に登録済みです。先に所属を解除してください。
다른 저장이 진행 중입니다. 잠시 후 다시 시도하세요.¦Another save is in progress. Try again shortly.¦別の保存処理中です。しばらくしてから再試行してください。
다시 실행했습니다.¦Redone.¦やり直しました。
대지 크기를 변경했습니다.¦Site resized.¦敷地サイズを変更しました。
대지는 이동할 수 없습니다.¦The site cannot be moved.¦敷地は移動できません。
도면 데이터가 서버의 2 MB 제한을 초과했습니다.¦Layout data exceeds the server's 2 MB limit.¦図面データがサーバーの2 MB制限を超えています。
도면 정보가 너무 큽니다.¦Layout data is too large.¦図面情報が大きすぎます。
도면과 추가 에셋 목록을 기본값으로 저장했습니다.¦Saved the layout and custom asset list as the default.¦図面と追加アセット一覧を既定値として保存しました。
드래그: 이동 · 우클릭 드래그: 회전 · 휠: 확대/축소¦Drag: pan · Right-drag: orbit · Wheel: zoom¦ドラッグ: 移動・右ドラッグ: 回転・ホイール: 拡大/縮小
등록된 에셋은 유지됩니다. 실행 취소로 복원할 수 있습니다.¦Registered assets are retained. You can undo this change.¦登録済みアセットは保持されます。「元に戻す」で復元できます。
등록된 층이 있는 건물은 크기를 변경할 수 없습니다.¦Buildings with registered floors cannot be resized.¦登録済みフロアのある建物はサイズ変更できません。
등록하지 못했습니다.¦Registration failed.¦登録できませんでした。
등록할 층을 다시 선택하세요.¦Select the floor to register again.¦登録するフロアを選択し直してください。
등록할 층을 찾을 수 없습니다.¦Floor to register not found.¦登録するフロアが見つかりません。
로컬 서버 응답을 확인하지 못했습니다.¦Unable to verify the local server response.¦ローカルサーバーの応答を確認できません。
로컬 에셋 검증에 실패했습니다.¦Local asset validation failed.¦ローカルアセットの検証に失敗しました。
로컬 에셋 파일을 확인하지 못했습니다.¦Unable to verify the local asset file.¦ローカルアセットファイルを確認できません。
모델 데이터가 손상되었습니다.¦Model data is corrupted.¦モデルデータが破損しています。
모델 파일 검증에 실패했습니다.¦Model file validation failed.¦モデルファイルの検証に失敗しました。
변경된 경로의 선분별 색상이 필요합니다.¦The changed route requires segment colors.¦変更された経路には線分ごとの色が必要です。
복원 실패 · 자동 저장 중지¦Restore failed · Autosave paused¦復元失敗・自動保存停止
부지 가로¦Site width¦敷地の幅
부지 세로¦Site depth¦敷地の奥行き
분기점 이동에 필요한 코너가 64개 제한을 넘습니다. 포인트를 최적화하세요.¦Moving this junction would exceed 64 corners. Optimize points first.¦分岐点の移動に必要なコーナーが64個を超えます。ポイントを最適化してください。
불러오는 중 작업이 변경되어 열기를 취소했습니다. 다시 열어주세요.¦Work changed during loading, so opening was canceled. Open again.¦読込中に作業が変更されたため中止しました。開き直してください。
브라우저 자동 저장에 실패했습니다. 프로젝트 저장으로 작업을 보관하세요.¦Browser autosave failed. Use Save project to keep your work.¦ブラウザの自動保存に失敗しました。プロジェクトを保存してください。
삭제할 추가 설비를 찾을 수 없습니다.¦Custom equipment to delete not found.¦削除する追加設備が見つかりません。
삭제할 포인트를 선택하세요.¦Select a point to delete.¦削除するポイントを選択してください。
상위 설비가 없는 연결선입니다.¦This connection has no parent equipment.¦上位設備のない接続線です。
상위 설비를 찾을 수 없습니다.¦Parent equipment not found.¦上位設備が見つかりません。
새 기본 프로젝트를 불러왔습니다. 이전 작업은 백업했습니다.¦Loaded the new default project. Previous work was backed up.¦新しい既定プロジェクトを読み込みました。以前の作業はバックアップ済みです。
새 기본 프로젝트를 불러왔지만 자동 저장을 중지했습니다. 이전 작업은 백업되어 있습니다.¦Loaded the new default project, but autosave is paused. Previous work is backed up.¦新しい既定プロジェクトを読み込みましたが、自動保存は停止中です。以前の作業はバックアップ済みです。
새 프로젝트 · 추가 에셋 목록을 초기화했습니다. 실행 취소로 복구할 수 있습니다.¦New project · Custom assets reset. You can undo this change.¦新規プロジェクト・追加アセット一覧を初期化しました。「元に戻す」で復元できます。
색상을 변경할 선분을 선택하세요.¦Select a segment to change its color.¦色を変更する線分を選択してください。
서버 연결 준비 중입니다. API 연결 후 설비 코드를 지정할 수 있습니다.¦Server integration is in preparation. Equipment codes can be assigned after API integration.¦サーバー接続は準備中です。API接続後に設備コードを指定できます。
서버에서 파일 저장에 실패했습니다. 서버 로그와 파일 쓰기 권한을 확인하세요.¦Server file save failed. Check server logs and write permissions.¦サーバーでの保存に失敗しました。ログと書込権限を確認してください。
선분 좌표에 숫자를 입력하세요.¦Enter numeric segment coordinates.¦線分座標を数値で入力してください。
선분별 색상과 포인트 수가 올바르지 않습니다.¦Invalid segment colors or point count.¦線分色またはポイント数が不正です。
선분을 선택하세요.¦Select a segment.¦線分を選択してください。
선택한 백업을 찾을 수 없습니다.¦Selected backup not found.¦選択したバックアップが見つかりません。
선택한 설비가 없습니다.¦No equipment selected.¦設備が選択されていません。
선택한 설비를 중심점 기준으로 90° 회전했습니다.¦Rotated selected equipment 90° around its center.¦選択設備を中心基準で90°回転しました。
선택한 설비를 함께 이동했습니다.¦Moved selected equipment together.¦選択設備をまとめて移動しました。
선택한 이전 작업 백업을 저장했습니다.¦Saved the selected previous-work backup.¦選択した以前の作業のバックアップを保存しました。
설비 ID와 지정된 코드는 중복될 수 없습니다.¦Equipment IDs and assigned codes must be unique.¦設備IDと指定コードは重複できません。
설비 고정점은 삭제할 수 없습니다.¦Fixed equipment endpoints cannot be deleted.¦設備の固定端点は削除できません。
설비 고정점은 이동할 수 없습니다.¦Fixed equipment endpoints cannot be moved.¦設備の固定端点は移動できません。
설비 메시와 장면이 포함된 GLB가 필요합니다.¦The GLB must contain equipment meshes and a scene.¦設備メッシュとシーンを含むGLBが必要です。
설비 배치는 3D View 또는 평면도에서 진행하세요.¦Place equipment in 3D View or Plan View.¦設備は3D表示または平面図で配置してください。
설비 위치를 변경했습니다.¦Equipment position updated.¦設備位置を変更しました。
설비 이동에 필요한 연결선 포인트가 64개 제한을 넘습니다.¦Moving the equipment would exceed 64 connection points.¦設備移動に必要な接続線ポイントが64個を超えます。
설비 이동을 취소했습니다.¦Equipment movement canceled.¦設備の移動を取り消しました。
설비 코드: 32자 이하의 문자열이 필요합니다.¦Equipment code: enter up to 32 characters.¦設備コード: 32文字以内で入力してください。
설비 크기 항목이 아닙니다.¦Not an equipment dimension.¦設備サイズの項目ではありません。
설비 크기가 공간보다 커서 정렬할 수 없습니다.¦Cannot align: equipment is larger than the space.¦設備が空間より大きいため整列できません。
설비 크기는 0보다 큰 숫자를 입력하세요.¦Equipment dimensions must be positive numbers.¦設備サイズには0より大きい数値を入力してください。
설비가 소속된 층을 찾을 수 없습니다.¦Equipment's floor not found.¦設備の所属フロアが見つかりません。
설비를 2개 이상 선택하세요.¦Select at least two equipment items.¦設備を2台以上選択してください。
설비를 배치할 층으로 먼저 진입하세요.¦Enter the target floor before placing equipment.¦設備を配置するフロアへ先に入ってください。
설비를 배치할 층을 선택하세요.¦Select a floor for the equipment.¦設備を配置するフロアを選択してください。
설비를 복제했습니다. 위치와 겹침을 확인하세요.¦Equipment duplicated. Check its position and overlaps.¦設備を複製しました。位置と重なりを確認してください。
설비를 삭제하고 하위 설비는 한 단계 위로 옮겼습니다. 실행 취소할 수 있습니다.¦Deleted the equipment and moved its children up one level. You can undo this.¦設備を削除し、下位設備を1つ上へ移動しました。「元に戻す」が可能です。
설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.¦Equipment deleted. You can undo this.¦設備を削除しました。「元に戻す」で復元できます。
설비에 연결된 검은색 고정점은 삭제할 수 없습니다.¦Fixed endpoints attached to equipment cannot be deleted.¦設備に接続された固定端点は削除できません。
설비에 연결된 검은색 고정점은 이동할 수 없습니다.¦Fixed endpoints attached to equipment cannot be moved.¦設備に接続された固定端点は移動できません。
설비의 계층과 소속 공간을 변경했습니다.¦Equipment hierarchy and location updated.¦設備の階層と所属空間を変更しました。
설비의 계층과 순서를 변경했습니다.¦Equipment hierarchy and order updated.¦設備の階層と順序を変更しました。
설비의 소속 공간을 변경했습니다.¦Equipment location updated.¦設備の所属空間を変更しました。
설비의 추가 에셋 정보가 없습니다.¦Equipment's custom asset metadata is missing.¦設備の追加アセット情報がありません。
수직으로 정렬했습니다.¦Aligned vertically.¦垂直方向に整列しました。
수평으로 정렬했습니다.¦Aligned horizontally.¦水平方向に整列しました。
순환 연결 포함¦Includes a circular connection¦循環接続を含む
순환하는 전력 연결은 추가할 수 없습니다.¦Circular power connections are not allowed.¦循環する電力接続は追加できません。
숫자를 입력하세요. 마지막 유효한 값을 유지합니다.¦Enter a number. The last valid value is retained.¦数値を入力してください。最後の有効な値を保持します。
실행을 취소했습니다.¦Undone.¦元に戻しました。
알 수 없는 설비 종류가 포함되어 있습니다.¦Unknown equipment type found.¦不明な設備種類が含まれています。
에디터를 실행하려면 브라우저의 JavaScript를 켜 주세요.¦Enable JavaScript in your browser to run the editor.¦エディターを実行するにはJavaScriptを有効にしてください。
에셋 ID가 올바르지 않습니다.¦Invalid asset ID.¦アセットIDが不正です。
에셋 ID가 중복되었습니다.¦Duplicate asset ID.¦アセットIDが重複しています。
에셋 등록 목록을 읽을 수 없습니다.¦Unable to read the asset registry.¦アセット登録一覧を読み込めません。
에셋 등록 정보가 없습니다.¦Asset metadata is missing.¦アセット登録情報がありません。
에셋 목록을 불러오지 못했습니다.¦Unable to load the asset list.¦アセット一覧を読み込めません。
에셋 보관함을 열지 못했습니다.¦Unable to open asset storage.¦アセット保管庫を開けません。
에셋 저장이 취소되었습니다.¦Asset save canceled.¦アセットの保存を取り消しました。
에셋 종류가 올바르지 않습니다.¦Invalid asset type.¦アセット種類が不正です。
에셋 파일 식별값이 올바르지 않습니다.¦Invalid asset file identifier.¦アセットファイル識別値が不正です。
에셋 파일이 25 MB를 초과합니다.¦Asset file exceeds 25 MB.¦アセットファイルが25 MBを超えています。
에셋을 저장하지 못했습니다. 브라우저 저장 공간을 확인하세요.¦Unable to save the asset. Check browser storage.¦アセットを保存できません。ブラウザの保存領域を確認してください。
연결 변경을 적용하지 못했습니다.¦Unable to apply connection changes.¦接続の変更を適用できません。
연결 해제¦Disconnect¦接続解除
연결망 전체¦Entire network¦接続網全体
연결선 끝점¦Connection endpoint¦接続線の端点
연결선 변경을 적용하지 못했습니다.¦Unable to apply route changes.¦接続線の変更を適用できません。
연결선 중간 포인트는 최대 64개입니다.¦Up to 64 intermediate connection points are allowed.¦接続線の中間ポイントは最大64個です。
연결선 지름은 0.02~2 m로 입력하세요.¦Enter a connection diameter of 0.02–2 m.¦接続線の直径は0.02～2 mで入力してください。
연결선 팔레트의 색상을 선택하세요.¦Choose a color from the connection palette.¦接続線パレットの色を選択してください。
연결선 포인트¦Connection point¦接続線ポイント
연결선 포인트가 너무 많습니다.¦Too many connection points.¦接続線ポイントが多すぎます。
연결선 포인트는 부지 안에 놓으세요.¦Keep connection points inside the site.¦接続線ポイントは敷地内に配置してください。
연결선에는 시작점과 끝점이 필요합니다.¦A connection requires a start and end point.¦接続線には始点と終点が必要です。
연결선을 선택하세요.¦Select a connection.¦接続線を選択してください。
연결선을 찾을 수 없습니다.¦Connection not found.¦接続線が見つかりません。
연결선이 대지 밖으로 벗어납니다. 크기를 늘려주세요.¦Connections extend outside the site. Increase its size.¦接続線が敷地外にはみ出します。敷地を広げてください。
연결할 설비를 선택하세요.¦Select equipment to connect.¦接続する設備を選択してください。
연두¦Lime¦黄緑
주황¦Orange¦オレンジ
청록¦Teal¦青緑
하늘¦Sky blue¦空色
영역 밖¦Outside bounds¦範囲外
오브젝트를 삭제했습니다. 하위 항목은 보존되며 실행 취소할 수 있습니다.¦Object deleted. Children are retained; you can undo this.¦オブジェクトを削除しました。下位項目は保持され、「元に戻す」が可能です。
옥상 높이를 확인하세요. 다른 층과 겹치지 않는 높이를 입력하세요.¦Check roof elevation. Choose a height that does not overlap other floors.¦屋上高さを確認してください。他のフロアと重ならない値を入力してください。
옥상은 지상 2층 이상일 때 사용할 수 있습니다.¦A roof requires at least two above-ground levels.¦屋上は地上2階以上の場合に使用できます。
올바르지 않은 이동 위치입니다.¦Invalid move position.¦移動先が不正です。
올바른 GLB 2.0 파일이 아닙니다.¦Not a valid GLB 2.0 file.¦有効なGLB 2.0ファイルではありません。
올바른 정렬 방향을 선택하세요.¦Choose a valid alignment direction.¦有効な整列方向を選択してください。
외부 선분의 색상 정보가 올바르지 않습니다.¦Invalid external segment color data.¦外部線分の色情報が不正です。
외부 연결선 목록이 올바르지 않습니다.¦Invalid external connection list.¦外部接続線一覧が不正です。
외부 연결선 좌표가 올바르지 않습니다.¦Invalid external connection coordinates.¦外部接続線座標が不正です。
외부 연결선 지름 또는 색상이 올바르지 않습니다.¦Invalid external connection diameter or color.¦外部接続線の直径または色が不正です。
외부 연결선 포인트는 2~130개까지 지원합니다.¦External connections support 2–130 points.¦外部接続線は2～130ポイントに対応します。
외부 연결선은 수평·수직으로 연결하세요.¦External connections must be orthogonal.¦外部接続線は水平・垂直に接続してください。
외부 연결선을 찾을 수 없습니다.¦External connection not found.¦外部接続線が見つかりません。
외부 연결선의 설비 정보가 올바르지 않습니다.¦Invalid equipment data in external connection.¦外部接続線の設備情報が不正です。
외부 연결선이 중복되었습니다.¦Duplicate external connection.¦外部接続線が重複しています。
유효한 숫자를 입력하세요.¦Enter a valid number.¦有効な数値を入力してください。
이동할 선분을 선택하세요.¦Select a segment to move.¦移動する線分を選択してください。
이동할 설비를 찾을 수 없습니다.¦Equipment to move not found.¦移動する設備が見つかりません。
이동할 층을 선택하세요.¦Select a floor to move.¦移動するフロアを選択してください。
이동할 포인트를 선택하세요.¦Select a point to move.¦移動するポイントを選択してください。
이름은 1~60자, 영문명은 80자 이하로 입력하세요.¦Enter a name of 1–60 characters and an English name up to 80 characters.¦名前は1～60文字、英語名は80文字以内で入力してください。
이미 연결된 설비입니다.¦Equipment is already connected.¦接続済みの設備です。
이전 작업을 읽지 못했습니다. 원본 보존을 위해 자동 저장을 중지했습니다. 파일 열기·프로젝트 저장은 사용할 수 있습니다.¦Unable to restore previous work. Autosave is paused to protect the original. Open/Save project are still available.¦以前の作業を読めません。原本保護のため自動保存を停止しました。プロジェクトの読込・保存は使用できます。
자기 자신으로 이동할 수 없습니다.¦Cannot move an item into itself.¦自分自身へ移動できません。
자기 자신이나 하위 설비 안으로 이동할 수 없습니다.¦Cannot move into itself or its descendants.¦自分自身または下位設備の中へ移動できません。
자기 자신이나 하위 항목으로 이동할 수 없습니다.¦Cannot move into itself or its descendants.¦自分自身または下位項目へ移動できません。
자동 저장 실패 · 파일로 보관¦Autosave failed · Save to file¦自動保存失敗・ファイルに保存してください
자동 저장 중지 · 파일로 보관¦Autosave paused · Save to file¦自動保存停止・ファイルに保存してください
저장 요청 형식이 올바르지 않습니다. 화면을 새로 고친 뒤 재시도하세요.¦Invalid save request. Reload and try again.¦保存要求形式が不正です。再読込して再試行してください。
저장 요청의 주소 또는 파일 경로가 허용되지 않았습니다. 프로젝트 로컬 서버에서 열어주세요.¦Save address or path is not allowed. Open the project on its local server.¦保存先URLまたはパスが許可されていません。プロジェクトのローカルサーバーで開いてください。
저장 위치 선택을 지원하는 Edge 또는 Chrome에서 프로젝트 저장을 사용하세요.¦Save projects in Edge or Chrome with support for choosing a save location.¦保存先選択に対応したEdgeまたはChromeで保存してください。
전력 연결 구조 변환을 완료하지 못해 원본을 유지합니다. 자동 저장을 중지했습니다.¦Power-connection migration failed. The original is retained and autosave is paused.¦電力接続構造の変換に失敗しました。原本を保持し、自動保存を停止しました。
전력 연결 목록이 올바르지 않습니다.¦Invalid power connection list.¦電力接続一覧が不正です。
전력 연결을 추가했습니다.¦Power connection added.¦電力接続を追加しました。
전력 연결을 해제했습니다.¦Power connection removed.¦電力接続を解除しました。
전력 연결의 출발·도착 설비가 올바르지 않습니다.¦Invalid source or target equipment in power connection.¦電力接続の始点・終点設備が不正です。
전체 층 위치¦All-floor position¦全フロアの位置
전체 층 X·Z 위치와 각 층 크기를 조절합니다. 크기는 건물 범위와 층간 간격 안에서 제한됩니다.¦Adjust all floors' X/Z positions and each floor's size within the building and floor-spacing limits.¦全フロアのX/Z位置と各フロアのサイズを、建物範囲とフロア間隔内で調整します。
정리¦Optimize¦整理
좌우 드래그: 빠른 조절 · Shift+드래그: 미세 조절 · Esc: 취소¦Drag horizontally: adjust · Shift+drag: fine adjustment · Esc: cancel¦左右ドラッグ: 調整・Shift+ドラッグ: 微調整・Esc: 取消
지원하지 않는 그룹 속성입니다.¦Unsupported group property.¦未対応のグループ属性です。
지원하지 않는 설비입니다.¦Unsupported equipment.¦未対応の設備です。
지원하지 않는 프로젝트 파일입니다.¦Unsupported project file.¦未対応のプロジェクトファイルです。
직선 위 불필요한 포인트를 제거합니다.¦Remove redundant points on straight lines.¦直線上の不要なポイントを削除します。
첫 번째 설비를 배치해 보세요¦Place your first equipment¦最初の設備を配置してください
최상위 목록 끝으로 이동했습니다.¦Moved to the end of the top-level list.¦最上位一覧の末尾へ移動しました。
최적 경로로 정리할까요?¦Optimize the route?¦経路を最適化しますか？
최적화¦Optimize¦最適化
추가 설비 삭제¦Delete custom equipment¦追加設備を削除
추가 설비를 삭제하지 못했습니다.¦Unable to delete custom equipment.¦追加設備を削除できません。
추가 설비를 삭제할까요?¦Delete custom equipment?¦追加設備を削除しますか？
추가 설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.¦Custom equipment deleted. You can undo this.¦追加設備を削除しました。「元に戻す」で復元できます。
추가 에셋¦Custom asset¦追加アセット
추가 에셋 파일을 읽을 수 없습니다.¦Unable to read the custom asset file.¦追加アセットファイルを読み込めません。
추가 에셋 파일이 누락되었거나 목록과 다릅니다.¦Custom asset files are missing or differ from the list.¦追加アセットファイルがないか一覧と異なります。
추가 에셋 합계가 256 MB를 초과합니다.¦Custom assets exceed 256 MB in total.¦追加アセットの合計が256 MBを超えています。
층 GLB를 교체했습니다. 내부 설비는 유지됩니다.¦Floor GLB replaced. Equipment inside is retained.¦フロアGLBを置換しました。内部設備は保持されます。
층 등록 닫기¦Close floor registration¦フロア登録を閉じる
층 등록을 완료하거나 취소하세요.¦Complete or cancel floor registration.¦フロア登録を完了または取り消してください。
층 모델¦Floor model¦フロアモデル
층 배치 높이¦Floor elevation¦フロア配置高さ
층 번호¦Floor number¦フロア番号
층 소속은 v3 이상 프로젝트에 저장해야 합니다.¦Floor membership requires project v3 or later.¦フロア所属の保存にはv3以降のプロジェクトが必要です。
층 수는 0~100의 정수로 입력하세요.¦Enter an integer floor count from 0 to 100.¦フロア数は0～100の整数で入力してください。
층 위치를 숫자로 입력하세요.¦Enter numeric floor positions.¦フロア位置を数値で入力してください。
층 크기를 줄인 뒤 이동하세요.¦Reduce the floor size before moving.¦フロアサイズを小さくしてから移動してください。
층과 내부 설비를 대지로 이동했습니다.¦Moved the floor and its equipment to the site.¦フロアと内部設備を敷地へ移動しました。
층과 내부 설비를 삭제하고 층 간격을 조절했습니다. 실행 취소로 복원할 수 있습니다.¦Deleted the floor and its equipment and adjusted spacing. You can undo this.¦フロアと内部設備を削除し、間隔を調整しました。「元に戻す」で復元できます。
층별 연결선 목록이 올바르지 않습니다.¦Invalid floor connection list.¦フロア別接続線一覧が不正です。
층별 연결선 색상이 올바르지 않습니다.¦Invalid floor connection colors.¦フロア別接続線の色が不正です。
층별 연결선 좌표가 올바르지 않습니다.¦Invalid floor connection coordinates.¦フロア別接続線座標が不正です。
층별 연결선 포인트는 2~66개까지 지원합니다.¦Floor connections support 2–66 points.¦フロア別接続線は2～66ポイントに対応します。
층별 연결선은 직각으로 연결하세요.¦Floor connections must be orthogonal.¦フロア別接続線は直角に接続してください。
층별 연결선을 선택하세요.¦Select a floor connection.¦フロア別接続線を選択してください。
층별 연결선을 찾을 수 없습니다.¦Floor connection not found.¦フロア別接続線が見つかりません。
층별 연결선의 설비·층 정보가 올바르지 않습니다.¦Invalid equipment/floor data in floor connection.¦フロア別接続線の設備・フロア情報が不正です。
층별 연결선이 중복되었습니다.¦Duplicate floor connection.¦フロア別接続線が重複しています。
층은 건물 또는 대지로 이동하세요.¦Move floors to a building or the site.¦フロアは建物または敷地へ移動してください。
층은 건물 또는 대지에 배치하세요.¦Place floors in a building or on the site.¦フロアは建物または敷地に配置してください。
층을 등록했습니다. 실행 취소로 복원할 수 있습니다.¦Floors registered. You can undo this.¦フロアを登録しました。「元に戻す」で復元できます。
층을 배치할 공간이 부족합니다.¦Not enough space to place floors.¦フロアを配置する空間が不足しています。
층을 배치할 공간이 부족합니다. 층 수나 건물 크기를 조정하세요.¦Not enough space for floors. Adjust the count or building size.¦フロアを配置する空間が不足しています。フロア数または建物サイズを調整してください。
층을 삭제할까요?¦Delete this floor?¦このフロアを削除しますか？
층의 건물이 없습니다.¦The floor's building is missing.¦フロアの所属建物がありません。
코너·분기점·설비 접속점은 유지됩니다.¦Corners, junctions and equipment endpoints are retained.¦コーナー・分岐点・設備接続点は保持されます。
크기는 0보다 커야 합니다.¦Dimensions must be greater than zero.¦サイズは0より大きい値にしてください。
텍스처가 포함된 GLB · 최대 25 MB¦GLB with embedded textures · Up to 25 MB¦テクスチャを含むGLB・最大25 MB
텍스처를 읽지 못했습니다. PNG/JPEG 텍스처를 확인하고 다시 내보내세요.¦Unable to read textures. Check PNG/JPEG textures and export again.¦テクスチャを読み込めません。PNG/JPEGを確認して再出力してください。
텍스처와 버퍼를 모두 파일 안에 포함한 GLB로 내보내세요.¦Export GLB with all textures and buffers embedded.¦テクスチャとバッファをすべて埋め込んだGLBで出力してください。
파일 저장을 취소했습니다.¦File save canceled.¦ファイル保存を取り消しました。
파일을 읽지 못했습니다.¦Unable to read the file.¦ファイルを読み込めません。
편집한 포인트와 선분 색상이 초기화됩니다.¦Edited points and segment colors will be reset.¦編集済みポイントと線分色を初期化します。
포인트 좌표를 숫자로 입력하세요.¦Enter numeric point coordinates.¦ポイント座標を数値で入力してください。
포인트 좌표에 숫자를 입력하세요.¦Enter numeric point coordinates.¦ポイント座標を数値で入力してください。
포인트는 층 경계 3m 이내에 놓으세요.¦Keep points within 3 m of the floor boundary.¦ポイントはフロア境界から3 m以内に配置してください。
포인트를 최적화할까요?¦Optimize points?¦ポイントを最適化しますか？
포인트를 추가할 선분을 선택하세요.¦Select a segment to add a point.¦ポイントを追加する線分を選択してください。
프로젝트 데이터 또는 추가 에셋을 확인하지 못했습니다. 로컬 서버를 다시 시작한 뒤 재시도하세요.¦Unable to verify project data or custom assets. Restart the local server and retry.¦プロジェクトデータまたは追加アセットを確認できません。ローカルサーバーを再起動して再試行してください。
프로젝트 속성¦Project properties¦プロジェクトのプロパティ
프로젝트 에셋 목록이 없습니다.¦Project asset list is missing.¦プロジェクトのアセット一覧がありません。
프로젝트 정보가 손상되었습니다.¦Project metadata is corrupted.¦プロジェクト情報が破損しています。
프로젝트 정보가 올바르지 않습니다.¦Invalid project metadata.¦プロジェクト情報が不正です。
프로젝트 파일이 손상되었습니다.¦Project file is corrupted.¦プロジェクトファイルが破損しています。
프로젝트가 변경되었습니다. 닫고 다시 삭제하세요.¦The project changed. Close and try deleting again.¦プロジェクトが変更されました。閉じてから削除し直してください。
프로젝트는 압축 해제 기준 256 MB까지 지원합니다.¦Projects support up to 256 MB uncompressed.¦プロジェクトは展開後256 MBまで対応します。
프로젝트에 등록된 GLB 설비입니다.¦A GLB asset registered in this project.¦プロジェクトに登録されたGLB設備です。
프로젝트의 로컬 서버(http://127.0.0.1:4175)에서만 기본 프로젝트를 덮어쓸 수 있습니다.¦Overwrite defaults only on the project local server (http://127.0.0.1:4175).¦既定プロジェクトの上書きはローカルサーバー (http://127.0.0.1:4175) でのみ可能です。
하나의 층 오브젝트를 여러 슬롯에 등록할 수 없습니다.¦One floor object cannot be registered in multiple slots.¦1つのフロアを複数のスロットに登録できません。
하단 썸네일에서 설비를 선택하세요.¦Choose equipment from the thumbnails below.¦下部サムネイルから設備を選択してください。
하단 패널에서 층 에셋을 먼저 등록하세요.¦Register a floor asset in the bottom panel first.¦先に下部パネルでフロアアセットを登録してください。
하위 설비로 연결했습니다.¦Connected as child equipment.¦下位設備として接続しました。
한 개 이상의 층을 설정하세요.¦Configure at least one floor.¦フロアを1つ以上設定してください。
합쳐진 선분은 부모 쪽 색상을 사용합니다.¦Merged segments use the parent-side color.¦統合線分は親側の色を使用します。
현재 공간 안의 연결선을 선택하세요.¦Select a connection in the current space.¦現在の空間内の接続線を選択してください。
현재 공간의 연결선을 설비와 주변 선을 피해 직각 경로로 정리합니다.¦Route connections orthogonally around equipment and nearby lines in the current space.¦現在の空間で設備や周囲の線を避け、接続線を直角経路に整理します。
현재 도면과 추가 에셋 목록을 기본 구성으로 저장합니다.¦Save the current layout and custom assets as the default configuration.¦現在の図面と追加アセットを既定構成として保存します。
현재 도면에 에셋을 추가하지 못했습니다.¦Unable to add the asset to this layout.¦現在の図面にアセットを追加できません。
현재 서버는 기본 프로젝트 저장을 지원하지 않습니다. 프로젝트의 npm run dev로 실행하세요.¦This server does not support saving defaults. Run npm run dev in the project.¦このサーバーは既定プロジェクトの保存に未対応です。プロジェクトでnpm run devを実行してください。
현재 에셋 (목록 없음)¦Current asset (not listed)¦現在のアセット（一覧なし）
현재 작업과 자동 저장은 유지됩니다.¦Current work and autosave are retained.¦現在の作業と自動保存は保持されます。
회전은 0~359.999°로 입력하세요.¦Enter a rotation from 0 to 359.999°.¦回転は0～359.999°で入力してください。
{0}개 설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.¦Deleted {0} equipment items. You can undo this.¦設備{0}台を削除しました。「元に戻す」で復元できます。
{0}을(를) 대지에 배치했습니다.¦Placed {0} on the site.¦{0} を敷地に配置しました。
{0}을(를) 열었습니다. 실행 취소로 이전 작업을 복원할 수 있습니다.¦Opened {0}. Undo can restore previous work.¦{0} を開きました。「元に戻す」で以前の作業を復元できます。
01 상단바 오른쪽: 새 프로젝트 · 열기 · 저장 · 기본 프로젝트 교체 · 도움말 순서입니다.¦01 Top-right bar: New project, Open, Save, Replace default, Help and Settings.¦01 上部右側: 新規作成・読込・保存・既定値置換・ヘルプ・設定の順です。
02 상단 경로 표시: 뒤로가기와 대지·건물·층 이름을 눌러 이동합니다.¦02 Breadcrumb: use Back or click site/building/floor names to navigate.¦02 上部の経路: 「戻る」や敷地・建物・フロア名をクリックして移動します。
03 하단 에셋 창: 종류를 고르고 썸네일로 배치합니다. 오른쪽에서 에셋을 등록합니다.¦03 Asset tray: choose a category and place thumbnails. Register assets on the right.¦03 下部アセット一覧: 種類を選んでサムネイルで配置します。右側でアセットを登録します。
04 설비 정보 패널: 이름·위치·회전·크기를 조절합니다. ↔ 핸들은 드래그로 수치를 바꿉니다.¦04 Equipment properties: edit name, position, rotation and size. Drag ↔ handles to adjust values.¦04 設備情報: 名前・位置・回転・サイズを調整します。↔ハンドルで数値を変更します。
05 층 구성: 층 수와 옥상을 설정합니다. 옥상 바닥 높이에 맞춰 층 간격이 계산됩니다.¦05 Floor configuration: set floor count and roof. Spacing follows roof slab elevation.¦05 フロア構成: 階数と屋上を設定します。屋上床高さに合わせて間隔を計算します。
06 개별 층: 이름과 모델을 선택하고 비율 고정·가로·세로·높이를 설정합니다.¦06 Individual floors: choose names/models and set proportions, width, depth and height.¦06 各フロア: 名前とモデルを選び、縦横比・幅・奥行き・高さを設定します。
07 배치 미리보기: 건물 투명도를 조절하며 층의 위치와 크기를 비교합니다.¦07 Layout preview: adjust building transparency to compare floor positions and sizes.¦07 配置プレビュー: 建物の透明度を調整し、フロアの位置とサイズを比較します。
08 계층 구조: 대지 아래에 건물·층·설비가 배치됩니다. 대지는 녹색, 건물과 층은 파란색입니다.¦08 Hierarchy: buildings, floors and equipment are organized under the site. Sites are green; buildings and floors are blue.¦08 階層: 敷地の下に建物・フロア・設備が配置されます。敷地は緑、建物とフロアは青です。
09 전력 연결: 상위·하위 연결을 구분합니다. 기본 계층 연결은 계층 구조에서 변경합니다.¦09 Power connections: upstream and downstream are separate. Edit default connections in the hierarchy.¦09 電力接続: 上位・下位接続を区別します。基本接続は階層で変更します。
10 외부 연결 빌보드: 연결선 끝의 대상 이름을 클릭하면 해당 설비의 공간으로 이동합니다.¦10 External billboard: click the target name at the line end to open its space.¦10 外部接続ビルボード: 線の端の対象名をクリックすると、その設備の空間へ移動します。
11 연결선 선택: 선분의 네모 핸들을 드래그해 경로를 조절합니다.¦11 Connection selection: drag a segment's square handle to adjust the route.¦11 接続線選択: 線分の四角いハンドルをドラッグして経路を調整します。
12 연결선 정보 패널: 지름·선분 색상·포인트·최적 경로를 편집합니다.¦12 Connection properties: edit diameter, segment colors, points and routing.¦12 接続線情報: 直径・線分色・ポイント・経路最適化を編集します。
↻ 90°: 회전 · Esc: 이동 취소¦↻ 90°: rotate · Esc: cancel move¦↻ 90°: 回転・Esc: 移動取消
화살표: 축 이동 · 사각형: X·Z 동시 이동¦Arrows: axis movement · Square: move in X/Z¦矢印: 軸移動・四角: X/Z同時移動
실제 설비 규격에 맞게 변경하세요.¦Adjust to the actual equipment specifications.¦実際の設備仕様に合わせて変更してください。
프로젝트 저장 완료 · {0} MB · 추가 에셋 {1}개¦Project saved · {0} MB · {1} custom assets¦プロジェクト保存完了・{0} MB・追加アセット{1}個
크기는 {0}~{1} m 범위로 입력하세요.¦Enter dimensions between {0} and {1} m.¦サイズは{0}～{1} mで入力してください。
설비 가로는 {0}~{1} m로 입력하세요.¦Equipment width must be {0}–{1} m.¦設備の幅は{0}～{1} mで入力してください。
설비 세로는 {0}~{1} m로 입력하세요.¦Equipment depth must be {0}–{1} m.¦設備の奥行きは{0}～{1} mで入力してください。
설비 높이는 {0}~{1} m로 입력하세요.¦Equipment height must be {0}–{1} m.¦設備の高さは{0}～{1} mで入力してください。
{0}: 올바른 좌표가 필요합니다.¦{0}: valid coordinates are required.¦{0}: 有効な座標が必要です。
{0}: 1~{1}자로 입력하세요.¦{0}: enter 1–{1} characters.¦{0}: 1～{1}文字で入力してください。
{0}: {1}~{2} 범위의 숫자가 필요합니다.¦{0}: enter a number from {1} to {2}.¦{0}: {1}～{2}の数値を入力してください。
{0}이(가) 대지 밖으로 벗어납니다. 크기를 늘려주세요.¦{0} extends outside the site. Increase the site size.¦{0} が敷地外にはみ出します。敷地を広げてください。
설비는 최대 {0}개까지 지원합니다.¦Up to {0} equipment items are supported.¦設備は最大{0}台まで対応します。
설비는 최대 {0}개까지 배치할 수 있습니다.¦Up to {0} equipment items can be placed.¦設備は最大{0}台まで配置できます。
{0}: 설비가 부지 경계를 벗어납니다.¦{0}: equipment extends outside the site boundary.¦{0}: 設備が敷地境界を越えています。
{0}: 상위 설비를 찾을 수 없습니다.¦{0}: parent equipment not found.¦{0}: 上位設備が見つかりません。
이 층에 배치된 설비 {0}개와 해당 설비의 연결선도 함께 삭제됩니다.¦Also deletes {0} equipment items on this floor and their connections.¦このフロアの設備{0}台とその接続線も削除します。
{0}F · 옥상¦{0}F · Roof¦{0}F・屋上
{0} · 등록할 층 선택¦{0} · Select floor to register¦{0}・登録するフロアを選択
배치¦Place¦配置
전력 계층 변경¦Change power hierarchy¦電力階層を変更
최상위로 이동¦Move to top level¦最上位へ移動
{0} 하위로 이동¦Move under {0}¦{0} の下へ移動
{0}로 이동¦Move to {0}¦{0} へ移動
크기¦Size¦サイズ
층 GLB 교체¦Replace floor GLB¦フロアGLBを置換
건물에서 연결 해제¦Detach from building¦建物から所属を解除
내부 설비의 크기와 배치는 유지됩니다.¦Equipment sizes and placement inside are retained.¦内部設備のサイズと配置は保持されます。
옥상은 지상층 수에 포함됩니다. (지상 2층 이상)¦The roof counts as an above-ground floor (at least 2 floors).¦屋上は地上階数に含まれます（地上2階以上）。
층간 높이¦Floor-to-floor height¦階高
자동 계산¦Automatic¦自動計算
`;
  const entries=data.trim().split('\n').filter(Boolean).map(line=>line.split('¦'));
  for(const row of [...entries])if(/^\d\d /.test(row[0])&&row[0].includes(':'))entries.push([row[0]+' — 이미지 확대',row[1]+' — Enlarge image',row[2]+' — 画像を拡大']);
  const equipment=['송전탑','수전반','변압기','저압 배전반','분전반','태양광 패널','태양광 패널 2×2','태양광 패널 3×3'];
  for(const row of [...entries])if(equipment.includes(row[0])){entries.push([row[0]+' 배치','Place '+row[1],row[2]+' を配置']);entries.push([row[0]+' · '+row[1],row[1],row[2]]);}
  for(const row of [...entries,...[['x','X','X'],['z','Z','Z'],['width','Width','幅'],['depth','Depth','奥行き'],['height','Height','高さ']]])if(['도면 이름','프로젝트 이름','대지 이름','설비 이름','설비 ID','층 ID','상위 설비 ID','공간 ID','건물 ID','프로젝트 ID','이름','층 번호','대지 가로','대지 세로','부지 가로','부지 세로','X 좌표','Z 좌표','회전','가로','세로','높이','건물 높이','옥상 바닥 높이','층 배치 높이','층 크기','x','z','width','depth','height'].includes(row[0])){
    entries.push([row[0]+': 1~{0}자로 입력하세요.',row[1]+': enter 1–{0} characters.',row[2]+': 1～{0}文字で入力してください。']);
    entries.push([row[0]+': {0}~{1} 범위의 숫자가 필요합니다.',row[1]+': enter a number from {0} to {1}.',row[2]+': {0}～{1}の数値を入力してください。']);
    entries.push([row[0]+': {0}~{1} 범위로 입력하세요.',row[1]+': enter a number from {0} to {1}.',row[2]+': {0}～{1}の数値を入力してください。']);
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=entries;else root.FEMSLocaleEntries=entries;
})(typeof globalThis!=='undefined'?globalThis:this);
