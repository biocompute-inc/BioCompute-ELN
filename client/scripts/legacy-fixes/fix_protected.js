const fs = require('fs');
let code = fs.readFileSync('components/ProtectedLayout.tsx', 'utf8');

code = code.replace(
    'if (!user && !["/login", "/register", "/forgot-password"].includes(pathname)) {',
    '/* \n        if (!user && !["/login", "/register", "/forgot-password"].includes(pathname)) {'
);

code = code.replace(
    'router.push("/login");\n        }',
    'router.push("/login");\n        }\n        */'
);

code = code.replace(
    'if (!user && !["/login", "/register", "/forgot-password"].includes(pathname)) {',
    '/*\n    if (!user && !["/login", "/register", "/forgot-password"].includes(pathname)) {'
);

code = code.replace(
    'return <div style={{ width: "100vw", height: "100vh", background: T.bg }} />; // Loading state\n    }',
    'return <div style={{ width: "100vw", height: "100vh", background: T.bg }} />; // Loading state\n    }\n    */'
);

fs.writeFileSync('components/ProtectedLayout.tsx', code);
