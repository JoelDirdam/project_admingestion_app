import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno desde el archivo .env en la carpeta api
function loadEnvFile() {
  // Intentar desde diferentes ubicaciones posibles
  const possiblePaths = [
    path.join(__dirname, '..', 'api', '.env'),  // Desde scripts/ hacia api/
    path.join(process.cwd(), 'api', '.env'),     // Desde la raíz del proyecto
    path.join(process.cwd(), '.env'),            // Desde api/ directamente
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
      console.log(`📄 Variables de entorno cargadas desde: ${envPath}`);
      return;
    }
  }
  
  console.log('⚠️  No se encontró archivo .env, usando variables de entorno del sistema');
}

loadEnvFile();

const prisma = new PrismaClient();

interface DiagnosticResult {
  success: boolean;
  message: string;
  details?: any;
}

async function checkDatabaseConnection(): Promise<DiagnosticResult> {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    return {
      success: true,
      message: '✅ Conexión a la base de datos exitosa',
    };
  } catch (error: any) {
    return {
      success: false,
      message: '❌ Error de conexión a la base de datos',
      details: error.message,
    };
  }
}

function checkJwtSecret(): DiagnosticResult {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    return {
      success: false,
      message: '❌ JWT_SECRET no está configurado en las variables de entorno',
      details: 'Asegúrate de tener JWT_SECRET en tu archivo .env',
    };
  }
  
  if (jwtSecret === 'your-secret-key-here' || jwtSecret.length < 32) {
    return {
      success: false,
      message: '⚠️  JWT_SECRET está usando un valor por defecto o es muy corto',
      details: 'Se recomienda usar un secreto de al menos 32 caracteres para producción',
    };
  }
  
  return {
    success: true,
    message: '✅ JWT_SECRET está configurado correctamente',
    details: `Longitud: ${jwtSecret.length} caracteres`,
  };
}

async function diagnoseAdminUser(): Promise<DiagnosticResult> {
  try {
    const adminUsername = 'admin';
    const admin = await prisma.user.findUnique({
      where: { username: adminUsername },
      include: {
        company: true,
      },
    });

    if (!admin) {
      return {
        success: false,
        message: '❌ Usuario admin no encontrado',
        details: 'El usuario "admin" no existe en la base de datos',
      };
    }

    const issues: string[] = [];
    const info: string[] = [];

    // Verificar si está activo
    if (!admin.is_active) {
      issues.push('Usuario está INACTIVO (is_active = false)');
    } else {
      info.push('Usuario está activo');
    }

    // Verificar company_id
    if (!admin.company_id) {
      issues.push('No tiene company_id asignado');
    } else {
      info.push(`Company ID: ${admin.company_id}`);
      if (admin.company) {
        info.push(`Company: ${admin.company.name} (${admin.company.is_active ? 'activa' : 'inactiva'})`);
        if (!admin.company.is_active) {
          issues.push('La compañía asociada está inactiva');
        }
      } else {
        issues.push('La compañía asociada no existe');
      }
    }

    // Verificar password_hash
    if (!admin.password_hash) {
      issues.push('No tiene password_hash');
    } else {
      info.push('Password hash existe');
      // Verificar formato del hash (bcrypt tiene un formato específico)
      if (!admin.password_hash.startsWith('$2')) {
        issues.push('Password hash no tiene formato bcrypt válido');
      }
    }

    // Verificar rol
    if (admin.role !== Role.ADMIN) {
      issues.push(`Rol actual: ${admin.role} (debería ser ADMIN)`);
    } else {
      info.push('Rol: ADMIN');
    }

    return {
      success: issues.length === 0,
      message: issues.length === 0 
        ? '✅ Usuario admin encontrado y parece estar correcto'
        : '⚠️  Usuario admin encontrado pero tiene problemas',
      details: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        is_active: admin.is_active,
        company_id: admin.company_id,
        issues,
        info,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: '❌ Error al diagnosticar usuario admin',
      details: error.message,
    };
  }
}

async function testPasswordVerification(): Promise<DiagnosticResult> {
  try {
    const adminUsername = 'admin';
    const testPassword = 'admin123';
    
    const admin = await prisma.user.findUnique({
      where: { username: adminUsername },
    });

    if (!admin || !admin.password_hash) {
      return {
        success: false,
        message: '❌ No se puede probar la contraseña: usuario no encontrado o sin password_hash',
      };
    }

    try {
      const isValid = await bcrypt.compare(testPassword, admin.password_hash);
      
      if (isValid) {
        return {
          success: true,
          message: '✅ La contraseña "admin123" es válida',
        };
      } else {
        return {
          success: false,
          message: '❌ La contraseña "admin123" NO es válida',
          details: 'El password_hash no coincide con la contraseña esperada',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: '❌ Error al verificar la contraseña',
        details: error.message,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: '❌ Error al probar la verificación de contraseña',
      details: error.message,
    };
  }
}

async function resetAdminPassword(newPassword: string = 'admin123'): Promise<DiagnosticResult> {
  try {
    const adminUsername = 'admin';
    
    const admin = await prisma.user.findUnique({
      where: { username: adminUsername },
    });

    if (!admin) {
      return {
        success: false,
        message: '❌ Usuario admin no encontrado',
        details: 'No se puede resetear la contraseña de un usuario que no existe',
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { username: adminUsername },
      data: {
        password_hash: passwordHash,
      },
    });

    return {
      success: true,
      message: '✅ Contraseña del admin reseteada exitosamente',
      details: {
        username: adminUsername,
        newPassword,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: '❌ Error al resetear la contraseña',
      details: error.message,
    };
  }
}

async function activateAdminUser(): Promise<DiagnosticResult> {
  try {
    const adminUsername = 'admin';
    
    const admin = await prisma.user.findUnique({
      where: { username: adminUsername },
    });

    if (!admin) {
      return {
        success: false,
        message: '❌ Usuario admin no encontrado',
      };
    }

    await prisma.user.update({
      where: { username: adminUsername },
      data: {
        is_active: true,
      },
    });

    return {
      success: true,
      message: '✅ Usuario admin activado exitosamente',
    };
  } catch (error: any) {
    return {
      success: false,
      message: '❌ Error al activar el usuario admin',
      details: error.message,
    };
  }
}

async function ensureAdminHasCompany(): Promise<DiagnosticResult> {
  try {
    const adminUsername = 'admin';
    
    const admin = await prisma.user.findUnique({
      where: { username: adminUsername },
      include: { company: true },
    });

    if (!admin) {
      return {
        success: false,
        message: '❌ Usuario admin no encontrado',
      };
    }

    if (admin.company_id && admin.company) {
      return {
        success: true,
        message: '✅ Usuario admin ya tiene una compañía asignada',
        details: {
          company_id: admin.company_id,
          company_name: admin.company.name,
        },
      };
    }

    // Buscar o crear una compañía
    let company = await prisma.company.findFirst({
      where: { is_active: true },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Panaderia la Paz',
          slug: 'la-paz',
          email: 'admin@panaderialapaz.com',
          is_active: true,
        },
      });
    }

    await prisma.user.update({
      where: { username: adminUsername },
      data: {
        company_id: company.id,
      },
    });

    return {
      success: true,
      message: '✅ Company asignada al usuario admin',
      details: {
        company_id: company.id,
        company_name: company.name,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: '❌ Error al asignar company al usuario admin',
      details: error.message,
    };
  }
}

async function main() {
  console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN POST-MIGRACIÓN\n');
  console.log('='.repeat(60));
  console.log('');

  const results: DiagnosticResult[] = [];

  // 1. Verificar conexión a la base de datos
  console.log('1️⃣  Verificando conexión a la base de datos...');
  const dbResult = await checkDatabaseConnection();
  console.log(dbResult.message);
  if (dbResult.details) console.log('   Detalles:', dbResult.details);
  console.log('');
  results.push(dbResult);

  if (!dbResult.success) {
    console.log('❌ No se puede continuar sin conexión a la base de datos');
    await prisma.$disconnect();
    process.exit(1);
  }

  // 2. Verificar JWT_SECRET
  console.log('2️⃣  Verificando configuración de JWT_SECRET...');
  const jwtResult = checkJwtSecret();
  console.log(jwtResult.message);
  if (jwtResult.details) console.log('   Detalles:', jwtResult.details);
  console.log('');
  results.push(jwtResult);

  // 3. Diagnosticar usuario admin
  console.log('3️⃣  Diagnosticando usuario admin...');
  const adminResult = await diagnoseAdminUser();
  console.log(adminResult.message);
  if (adminResult.details) {
    if (adminResult.details.issues && adminResult.details.issues.length > 0) {
      console.log('   ⚠️  Problemas encontrados:');
      adminResult.details.issues.forEach((issue: string) => {
        console.log(`      - ${issue}`);
      });
    }
    if (adminResult.details.info && adminResult.details.info.length > 0) {
      console.log('   ℹ️  Información:');
      adminResult.details.info.forEach((info: string) => {
        console.log(`      - ${info}`);
      });
    }
  }
  console.log('');
  results.push(adminResult);

  // 4. Probar verificación de contraseña
  console.log('4️⃣  Probando verificación de contraseña...');
  const passwordResult = await testPasswordVerification();
  console.log(passwordResult.message);
  if (passwordResult.details) console.log('   Detalles:', passwordResult.details);
  console.log('');
  results.push(passwordResult);

  // Resumen
  console.log('='.repeat(60));
  console.log('📊 RESUMEN DEL DIAGNÓSTICO');
  console.log('='.repeat(60));
  
  const failedChecks = results.filter(r => !r.success);
  
  if (failedChecks.length === 0) {
    console.log('✅ Todos los checks pasaron. El sistema debería funcionar correctamente.');
  } else {
    console.log(`⚠️  Se encontraron ${failedChecks.length} problema(s):`);
    failedChecks.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.message}`);
    });
    console.log('');
    console.log('💡 SOLUCIONES SUGERIDAS:');
    console.log('');
    
    // Sugerencias basadas en los problemas encontrados
    if (!jwtResult.success) {
      console.log('   🔧 Para JWT_SECRET:');
      console.log('      - Asegúrate de tener JWT_SECRET en tu archivo .env');
      console.log('      - Ejemplo: JWT_SECRET=tu-secreto-super-seguro-de-al-menos-32-caracteres');
      console.log('');
    }
    
    if (!adminResult.success || !passwordResult.success) {
      console.log('   🔧 Para el usuario admin:');
      console.log('      - Ejecuta este script con --reset-password para resetear la contraseña');
      console.log('      - Ejecuta este script con --activate para activar el usuario');
      console.log('      - Ejecuta este script con --fix-company para asegurar que tenga company');
      console.log('');
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('');

  await prisma.$disconnect();
}

// Manejar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--reset-password')) {
  const passwordIndex = args.indexOf('--reset-password');
  const newPassword = args[passwordIndex + 1] || 'admin123';
  
  (async () => {
    console.log('🔐 Reseteando contraseña del admin...\n');
    const result = await resetAdminPassword(newPassword);
    console.log(result.message);
    if (result.details) {
      console.log(`   Nueva contraseña: ${result.details.newPassword}`);
    }
    await prisma.$disconnect();
  })();
} else if (args.includes('--activate')) {
  (async () => {
    console.log('✅ Activando usuario admin...\n');
    const result = await activateAdminUser();
    console.log(result.message);
    await prisma.$disconnect();
  })();
} else if (args.includes('--fix-company')) {
  (async () => {
    console.log('🏢 Asegurando que el admin tenga company...\n');
    const result = await ensureAdminHasCompany();
    console.log(result.message);
    if (result.details) {
      console.log(`   Company: ${result.details.company_name} (${result.details.company_id})`);
    }
    await prisma.$disconnect();
  })();
} else if (args.includes('--fix-all')) {
  (async () => {
    console.log('🔧 Aplicando todas las correcciones automáticas...\n');
    
    const activateResult = await activateAdminUser();
    console.log(activateResult.message);
    
    const companyResult = await ensureAdminHasCompany();
    console.log(companyResult.message);
    
    const passwordResult = await resetAdminPassword('admin123');
    console.log(passwordResult.message);
    
    console.log('\n✅ Correcciones aplicadas. Ejecuta el diagnóstico completo para verificar.');
    await prisma.$disconnect();
  })();
} else {
  // Ejecutar diagnóstico completo
  main().catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

