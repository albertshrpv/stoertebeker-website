import { exec, spawn } from "child_process";
import util from "util";

const async_exec = util.promisify(exec);

/**
 * @type {() => import('astro').AstroIntegration}
 */
export default () => ({
    name: "dev_bar_integration",
    hooks: {
        "astro:config:setup": ({ addDevToolbarApp }) => {
            addDevToolbarApp("./src/integrations/astro_build.ts");
        },
        "astro:server:setup": ({ server }) => {
            console.log("astro:server:setup");
            server.ws.on("astro-dev-toolbar:astro-build:initialized", () => {
                console.log("astro-build was initialized!!");
            });
            server.ws.on("astro-dev-toolbar:astro-build:toggled", async () => {
                console.log("astro-dev-toolbar:astro-build:toggled");
            });


            server.ws.on(
                "astro-build:clicked",
                async (data) => {
                    console.log("astro-build:clicked");

                    server.ws.send("astro-build:build-status", {
                        status: "running",
                    });
                    
                    await async_exec("NODE_ENV=production npm run build && npm run deploy", { maxBuffer: 1024 * 50000 }, (error, stdout, stderr) => {
                        if (error) {
                            console.log(`error: ${error.message}`);
                            server.ws.send("astro-build:build-status", {
                                status: "error",
                            });
                        }
                        if (stderr) {
                            console.log(`stderr: ${stderr}`);
                        }
                        // console.log(`stdout: ${stdout}`);
                        if (stdout.includes("[build] Complete!")) {
                            server.ws.send("astro-build:build-status", {
                                status: "finished",
                            });
                        }
                    });
                    console.log("ASYNC EXEC DONE");
                },
            );

            server.ws.on(
                "astro-restart-dev-server:clicked",
                async (data) => {
                    console.log("astro-restart-dev-server:clicked");

                    server.ws.send("astro-restart-dev-server:status", {
                        status: "running",
                    });

                    await async_exec("pm2 restart stoertebeker-astro", { maxBuffer: 1024 * 50000 }, (error, stdout, stderr) => {
                        if (error) {
                            console.log(`error: ${error.message}`);
                            server.ws.send("astro-restart-dev-server:status", {
                                status: "error",
                            });
                        }
                        if (stderr) {
                            console.log(`stderr: ${stderr}`);
                        }
                        if (stdout.includes("[stoertebeker-astro]")) {
                            server.ws.send("astro-restart-dev-server:status", {
                                status: "finished",
                            });
                        }
                    });
                    console.log("ASYNC EXEC DONE");
                },
            );
        },
    },
});
