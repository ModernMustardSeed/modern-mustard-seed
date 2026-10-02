import {build} from 'esbuild';
await build({entryPoints:['components/home/flathead/worker.ts'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'public/flathead/lake-worker-v9.js',nodePaths:['node_modules']});
