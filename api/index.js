import { Innertube, UniversalCache } from 'youtubei.js';

export default async function handler(req, res) {
    const { videoId, cookie } = req.query;
    console.log(`videoId: ${videoId}`);
    // Cookieが届いているかチェック（セキュリティー上、中身は全部プリントしない方が安全！）
    console.log(`Cookie受信: ${cookie ? "あり" : "なし"}`);

    if (!videoId) {
        res.status(400).json({ error: "videoIdが足りないよ！" });
        return;
    }

    try {
        const yt = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_locally: true,
            // 🚀 ここでCookieを流し込む！
            cookie: cookie || '' 
        });

        // ログイン状態になっているか確認（デバッグ用）
        console.log(`SESSION: ${yt.session.logged_in ? "ログイン成功！" : "ログイン失敗..."}`);

        const info = await yt.getInfo(videoId, 'ANDROID');
        
        // 動画リンクを取得
        const format = info.chooseFormat({ type: 'video+audio', quality: 'best' });
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json({
            success: true,
            logged_in: yt.session.logged_in,
            title: info.basic_info.title,
            url: format ? format.url : null
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
