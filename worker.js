// 完全适配你 wrangler.json 所有内置配置，无需手动修改任何参数！
export default {
    // HTTP API 接口服务
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const reqHeaders = request.headers;

        // 网站根首页
        if (path === "/") {
            return new Response("Hello world | 私有临时邮箱API服务已完整部署", {status: 200});
        }

        // ========== 接口1：数据库初始化 【首次使用必须运行1次】 ==========
        if (path === "/init") {
            const db = env.DB;
            // 自动创建邮箱库、邮件存储数据表
            await db.exec(`
                CREATE TABLE IF NOT EXISTS mail_box (
                    id TEXT PRIMARY KEY,
                    create_time INTEGER NOT NULL
                );
            `);
            await db.exec(`
                CREATE TABLE IF NOT EXISTS mail (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    box_id TEXT NOT NULL,
                    from_addr TEXT,
                    subject TEXT,
                    content TEXT,
                    receive_time INTEGER NOT NULL,
                    FOREIGN KEY (box_id) REFERENCES mail_box(id)
                );
            `);
            return new Response(JSON.stringify({code: 200, msg: "数据库初始化完成，邮箱服务全部可用"}), {
                headers: {"Content-Type": "application/json"}
            });
        }

        // ========== 全局强制API密钥鉴权（所有功能唯一安全锁） ==========
        const clientKey = reqHeaders.get("X-API-Key");
        if (clientKey !== env.ADMIN_PASSWORDS) {
            return new Response(JSON.stringify({code: 403, msg: "API密钥无效，无权访问"}), {
                status: 403,
                headers: {"Content-Type": "application/json"}
            });
        }

        // ========== 接口2：创建全新随机临时邮箱 ==========
        if (path === "/new") {
            const db = env.DB;
            // 生成12位安全随机邮箱前缀
            const randomStr = Math.random().toString(36).slice(2, 14);
            const mailAddr = `${randomStr}@workers.dev`;
            const now = Date.now();

            await db.exec("INSERT INTO mail_box (id, create_time) VALUES (?, ?)", mailAddr, now);
            return new Response(JSON.stringify({
                code: 200,
                msg: "临时邮箱创建成功",
                data: {address: mailAddr}
            }), {headers: {"Content-Type": "application/json"}});
        }

        // ========== 接口3：读取该邮箱收到的全部邮件（网站验证码全部在此） ==========
        if (path === "/mail") {
            const boxId = url.searchParams.get("address");
            if (!boxId) {
                return new Response(JSON.stringify({code: 400, msg: "缺少邮箱地址参数"}), {status: 400, headers: {"Content-Type": "application/json"}});
            }
            const db = env.DB;
            const mailList = await db.exec("SELECT * FROM mail WHERE box_id = ? ORDER BY receive_time DESC", boxId);
            
            return new Response(JSON.stringify({
                code: 200,
                data: mailList.results
            }), {headers: {"Content-Type": "application/json"}});
        }

        // ========== 接口4：查看你所有创建过的邮箱列表 ==========
        if (path === "/list") {
            const db = env.DB;
            const boxList = await db.exec("SELECT * FROM mail_box ORDER BY create_time DESC");
            return new Response(JSON.stringify({
                code: 200,
                data: boxList.results
            }), {headers: {"Content-Type": "application/json"}});
        }

        // ========== 接口5：删除指定临时邮箱 ==========
        if (path === "/delete" && request.method === "POST") {
            const body = await request.json().catch(() => ({}));
            const boxId = body.address;
            if (!boxId) return new Response(JSON.stringify({code:400,msg:"缺少邮箱地址参数"}),{status:400});
            
            const db = env.DB;
            await db.exec("DELETE FROM mail WHERE box_id = ?", boxId);
            await db.exec("DELETE FROM mail_box WHERE id = ?", boxId);
            return new Response(JSON.stringify({code:200,msg:"邮箱删除成功"}),{headers:{"Content-Type":"application/json"}});
        }

        // 未知路径返回404
        return new Response(JSON.stringify({code:404,msg:"接口路径不存在"}),{status:404,headers:{"Content-Type":"application/json"}});
    },

    // ========== 核心能力：Cloudflare 自动邮件接收（网站验证码自动入库） ==========
    async email(event, env) {
        const mail = event.mail;
        const toAddr = mail.to[0].address;    // 收件人（你自己创建的临时邮箱）
        const fromAddr = mail.from.address;   // 发件网站邮箱
        const subject = mail.subject;        // 邮件主题（验证码一般直接在这里）
        const content = mail.text;           // 邮件正文（完整验证码全部内容）
        const now = Date.now();

        const db = env.DB;
        // 安全拦截：**只接收你自己创建过的合法邮箱**，陌生邮件全部自动拒收
        const validBox = await db.exec("SELECT id FROM mail_box WHERE id = ?", toAddr);
        if (validBox.results.length === 0) return;

        // 验证码邮件自动写入你专属私有D1数据库
        await db.exec(
            "INSERT INTO mail (box_id, from_addr, subject, content, receive_time) VALUES (?, ?, ?, ?, ?)",
            toAddr, fromAddr, subject, content, now
        );
        return;
    }
};
