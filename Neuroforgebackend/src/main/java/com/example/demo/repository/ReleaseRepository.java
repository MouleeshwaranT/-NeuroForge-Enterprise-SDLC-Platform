package com.example.demo.repository;

import com.example.demo.model.Release;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReleaseRepository extends JpaRepository<Release, Long> {
    List<Release> findByProjectIdIn(List<Long> projectIds);
}