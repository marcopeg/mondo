/**
 * Example usage of the optimized CRM file manager
 *
 * This file demonstrates how to use the new singleton-based
 * file management system in your components.
 */

import React from "react";
import { useFiles } from "@/hooks/use-files";
import { CRMFileType } from "@/types/CRMFileType";

// Example 1: Using the existing useFiles hook (now optimized for CRM types)
export function CompanyList() {
  // This automatically uses the optimized path for 'company' type
  const companies = useFiles(CRMFileType.COMPANY);

  return (
    <div>
      <h3>Companies ({companies.length})</h3>
      <ul>
        {companies.map((cachedFile) => (
          <li key={cachedFile.file.path}>
            {cachedFile.file.basename}
            {/* Access cached frontmatter without filesystem hit */}
            {cachedFile.cache?.frontmatter?.description && (
              <span> - {cachedFile.cache.frontmatter.description}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example 2: Using the new useCRMFiles hook directly
export function PeopleInCompany({ companyName }: { companyName: string }) {
  // Optimized hook with custom filtering
  const people = useFiles(CRMFileType.PERSON, {
    filter: (cached) => {
      const companies = cached.cache?.frontmatter?.company || [];
      return companies.some((company: string) => company.includes(companyName));
    },
  });

  return (
    <div>
      <h3>
        People working at {companyName} ({people.length})
      </h3>
      <ul>
        {people.map((person) => (
          <li key={person.file.path}>
            {person.cache?.frontmatter?.name || person.file.basename}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example 3: Multi-type dashboard (multiple optimized hooks)
export function CRMDashboard() {
  // All of these use the optimized singleton cache
  const companies = useFiles(CRMFileType.COMPANY);
  const people = useFiles(CRMFileType.PERSON);
  const projects = useFiles(CRMFileType.PROJECT);
  const teams = useFiles(CRMFileType.TEAM);

  const totalEntities =
    companies.length + people.length + projects.length + teams.length;

  return (
    <div>
      <h2>CRM Dashboard</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
        }}
      >
        <div>
          <h3>Companies: {companies.length}</h3>
          {companies.slice(0, 5).map((company) => (
            <div key={company.file.path}>{company.file.basename}</div>
          ))}
        </div>

        <div>
          <h3>People: {people.length}</h3>
          {people.slice(0, 5).map((person) => (
            <div key={person.file.path}>{person.file.basename}</div>
          ))}
        </div>

        <div>
          <h3>Projects: {projects.length}</h3>
          {projects.slice(0, 5).map((project) => (
            <div key={project.file.path}>{project.file.basename}</div>
          ))}
        </div>

        <div>
          <h3>Teams: {teams.length}</h3>
          {teams.slice(0, 5).map((team) => (
            <div key={team.file.path}>{team.file.basename}</div>
          ))}
        </div>
      </div>

      <p>Total CRM entities: {totalEntities}</p>
    </div>
  );
}

// Example 4: Advanced filtering with folder constraints
export function TechCompanies() {
  const techCompanies = useFiles(CRMFileType.COMPANY, {
    filter: (cached) => {
      const tags = cached.cache?.frontmatter?.tags || [];
      const industry = cached.cache?.frontmatter?.industry;
      return (
        industry === "technology" ||
        tags.includes("tech") ||
        tags.includes("software")
      );
    },
  });

  return (
    <div>
      <h3>Technology Companies ({techCompanies.length})</h3>
      {techCompanies.map((company) => (
        <div key={company.file.path}>
          <strong>{company.file.basename}</strong>
          {company.cache?.frontmatter?.industry && (
            <span> ({company.cache.frontmatter.industry})</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Example 5: Getting file manager statistics
import { CRMFileManager } from "@/utils/CRMFileManager";
import { useApp } from "@/hooks/use-app";

export function CRMStats() {
  const app = useApp();
  const fileManager = CRMFileManager.getInstance(app);
  const stats = fileManager.getStats();

  return (
    <div>
      <h3>CRM Statistics</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(stats).map(([type, count]) => (
            <tr key={type}>
              <td>{type}</td>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => fileManager.refresh()}>Refresh Cache</button>
    </div>
  );
}
