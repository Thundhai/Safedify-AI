import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  console.log('🔄 Running database migrations...\n');

  try {
    // Read schema.sql file
    const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await pool.query(schemaSql);
    console.log('✅ Database schema created successfully');

    // Insert default roles
    console.log('\n🔄 Inserting default roles...');

    const defaultRoles = [
      {
        id: 'role-admin',
        name: 'Admin',
        description: 'Full system access and configuration.',
        isSystem: true,
        permissions: ['manage_roles', 'manage_users', 'view_analytics', 'create_incident', 'manage_incidents', 'perform_inspection', 'create_permit', 'approve_permit', 'manage_documents', 'ai_features']
      },
      {
        id: 'role-manager',
        name: 'HSE Manager',
        description: 'HSE Dept Lead. Approvals and Analytics.',
        isSystem: true,
        permissions: ['manage_users', 'view_analytics', 'create_incident', 'manage_incidents', 'perform_inspection', 'create_permit', 'approve_permit', 'manage_documents', 'ai_features']
      },
      {
        id: 'role-supervisor',
        name: 'HSE Supervisor',
        description: 'Site supervisor responsible for team safety.',
        isSystem: true,
        permissions: ['create_incident', 'perform_inspection', 'create_permit', 'ai_features']
      },
      {
        id: 'role-worker',
        name: 'Worker',
        description: 'General staff reporting observations.',
        isSystem: true,
        permissions: ['create_incident']
      }
    ];

    for (const role of defaultRoles) {
      await pool.query(
        `INSERT INTO roles (id, name, description, is_system, permissions)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE SET
         description = EXCLUDED.description,
         permissions = EXCLUDED.permissions`,
        [role.id, role.name, role.description, role.isSystem, JSON.stringify(role.permissions)]
      );
      console.log(`  ✅ Role: ${role.name}`);
    }

    // Insert inspection templates
    console.log('\n🔄 Inserting inspection templates...');

    const templates = [
      {
        name: 'General Construction Site',
        category: 'Construction',
        description: 'Daily safety checks for construction zones.',
        items: [
          'Are all workers wearing required PPE (Hard Hat, Boots, Vest)?',
          'Is perimeter fencing intact and secure?',
          'Are walkways clear of trip hazards and debris?',
          'Is scaffolding properly tagged (Green Tag) and secured?',
          'Are electrical cables elevated or protected?'
        ]
      },
      {
        name: 'Office Safety Audit',
        category: 'Facilities',
        description: 'Monthly office environment check.',
        items: [
          'Are emergency exits clear, unlocked and lit?',
          'Are extension cords daisy-chained? (Check for NO)',
          'Is lighting adequate in all areas?',
          'Are fire extinguishers inspected and tagged?',
          'Is the first aid kit stocked and accessible?'
        ]
      }
    ];

    for (const template of templates) {
      await pool.query(
        `INSERT INTO inspection_templates (name, category, description, items, is_system)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [template.name, template.category, template.description, JSON.stringify(template.items), true]
      );
      console.log(`  ✅ Template: ${template.name}`);
    }

    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
