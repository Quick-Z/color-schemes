import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "鹅包米 | 关于我",
  description: "关于渐变配色库作者和项目的一点介绍。",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f7] px-4 py-8 text-zinc-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-zinc-500">About Me</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-950 sm:text-4xl">
              鹅包米
            </h1>
            <p className="mt-3 text-base leading-7 text-zinc-600">
              一个喜欢把灵感、审美和工程秩序揉在一起的人。
            </p>
          </div>
          <Link
            className="w-fit rounded-md px-2 py-1 text-sm font-medium text-zinc-500 transition hover:bg-white hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 focus:ring-offset-[#f4f5f7]"
            href="/"
          >
            返回配色库
          </Link>
        </header>

        <section className="grid gap-8 border-b border-black/10 pb-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <article className="flex flex-col gap-6">
            <div className="space-y-5 text-base leading-8 text-zinc-700">
              <p className="text-lg leading-8 text-zinc-800">
                你好，我是「德育处主任」。平时喜欢做一些看起来舒服、用起来顺手的小工具，也喜欢研究色彩、界面体验和效率工作流。
              </p>
              <p>
                这个渐变配色库就是其中之一。它的灵感和原始配色来自{" "}
                <a
                  className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-700"
                  href="https://webgradients.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  WebGradients
                </a>
                ，我在它的基础上做了一些更适合自己使用的功能和改进。
              </p>
              <p>
                你可以在 GitHub 上看到这个版本的代码：{" "}
                <a
                  className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-700"
                  href="https://github.com/Quick-Z/color-schemes"
                  rel="noreferrer"
                  target="_blank"
                >
                  Quick-Z/color-schemes
                </a>
                。它支持添加自己的配色方案，也可以导入、导出备份，适合放在本地或自己的 NAS 上慢慢积累。
              </p>
              <p>
                项目使用 SQLite 存储数据，不需要额外的数据库服务。你可以在本地运行它，也可以部署到任何支持 Node.js &gt; 22.5.0 的平台上。对个人使用和私有化部署来说，它会比较轻便、省心。
              </p>
              <p>
                当然，SQLite 不适合高并发场景；我也没有给它搭用户系统。所以如果要放到公开生产环境，请先评估权限、负载和数据安全，真的需要三思。
              </p>
            </div>
          </article>

          <aside className="flex flex-col gap-5 rounded-lg border border-black/10 bg-white/75 p-5 shadow-sm shadow-zinc-950/5">
            <div>
              <p className="text-sm font-semibold text-zinc-500">公众号</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                德育处主任
              </h2>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-3">
              <Image
                alt="德育处主任公众号二维码"
                className="h-auto w-full rounded"
                height={258}
                priority
                src="/qrcode.jpg"
                width={258}
              />
            </div>

            <p className="text-sm leading-6 text-zinc-600">
              如果这个项目对你有帮助，欢迎扫码关注我的公众号。我会分享小工具、效率工作流、前端体验，以及一些折腾记录。
            </p>

            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
              href="/"
            >
              回去看配色
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
