package com.example.demo.config;

import com.example.demo.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/**",
                    "/error",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/h2-console/**"
                ).permitAll()
                
                // Allow all GET requests for authenticated users across all /api/** endpoints
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/**").authenticated()
                
                // User management restrictions
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/users/**", "/api/users").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/users/**", "/api/users").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/users/**", "/api/users").hasRole("ADMIN")
                
                // Project, sprint, team & release management restrictions
                .requestMatchers(org.springframework.http.HttpMethod.POST, 
                    "/api/projects/**", "/api/projects",
                    "/api/requirements/**", "/api/requirements",
                    "/api/sprints/**", "/api/sprints",
                    "/api/releases/**", "/api/releases",
                    "/api/build-pipelines/**", "/api/build-pipelines",
                    "/api/deployments/**", "/api/deployments",
                    "/api/teams/**", "/api/teams",
                    "/api/team-members/**", "/api/team-members").hasAnyRole("ADMIN", "PROJECT_MANAGER", "MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, 
                    "/api/projects/**", "/api/projects",
                    "/api/requirements/**", "/api/requirements",
                    "/api/sprints/**", "/api/sprints",
                    "/api/releases/**", "/api/releases",
                    "/api/build-pipelines/**", "/api/build-pipelines",
                    "/api/deployments/**", "/api/deployments",
                    "/api/teams/**", "/api/teams",
                    "/api/team-members/**", "/api/team-members").hasAnyRole("ADMIN", "PROJECT_MANAGER", "MANAGER")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, 
                    "/api/projects/**", "/api/projects",
                    "/api/requirements/**", "/api/requirements",
                    "/api/sprints/**", "/api/sprints",
                    "/api/releases/**", "/api/releases",
                    "/api/build-pipelines/**", "/api/build-pipelines",
                    "/api/deployments/**", "/api/deployments",
                    "/api/teams/**", "/api/teams",
                    "/api/team-members/**", "/api/team-members").hasAnyRole("ADMIN", "PROJECT_MANAGER", "MANAGER")

                // Task, Test Case, Test Run, Bug, Document, Chat, Notification, Metrics creation & updates
                .requestMatchers("/api/tasks/**", "/api/tasks",
                                 "/api/testcases/**", "/api/testcases",
                                 "/api/testruns/**", "/api/testruns",
                                 "/api/bugs/**", "/api/bugs",
                                 "/api/documents/**", "/api/documents",
                                 "/api/chat-messages/**", "/api/chat-messages",
                                 "/api/notifications/**", "/api/notifications",
                                 "/api/metrics/**", "/api/metrics",
                                 "/api/system-logs/**", "/api/system-logs").hasAnyRole("ADMIN", "PROJECT_MANAGER", "MANAGER", "DEVELOPER", "TESTER", "USER")
                
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173", "http://localhost:5174"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
