"""Executable entrypoint used by packaged desktop builds."""

from __future__ import annotations

import runpy
import sys
import typing


if typing.TYPE_CHECKING:
    from collections.abc import Sequence

MODULE_NAME_ARG_INDEX = 1
MODULE_ARGS_START_INDEX = 2
ERROR_EXIT_CODE = 1
SUCCESS_EXIT_CODE = 0


def module_name(argv: Sequence[str]) -> str:
    """Return the requested module name from process arguments."""
    if len(argv) <= MODULE_NAME_ARG_INDEX:
        msg = "planner module name is required"
        raise ValueError(msg)
    name = argv[MODULE_NAME_ARG_INDEX].strip()
    if name == "":
        msg = "planner module name is required"
        raise ValueError(msg)
    return name


def module_argv(argv: Sequence[str]) -> list[str]:
    """Build argv passed through to the requested planner module."""
    name = module_name(argv)
    return [name, *argv[MODULE_ARGS_START_INDEX:]]


def active_argv(argv: Sequence[str] | None) -> list[str]:
    """Return runtime argv from an explicit override or process state."""
    if argv is None:
        return list(sys.argv)
    return list(argv)


def write_error(message: object) -> int:
    """Write an error message to stderr and return a failure exit code."""
    sys.stderr.write(f"{message}\n")
    return ERROR_EXIT_CODE


def exit_code_from_system_exit(exit_signal: SystemExit) -> int:
    """Normalize a module SystemExit into an integer process exit code."""
    if isinstance(exit_signal.code, int):
        return exit_signal.code
    if exit_signal.code is None:
        return SUCCESS_EXIT_CODE
    return write_error(exit_signal.code)


def run_requested_module(argv: Sequence[str]) -> None:
    """Execute the requested planner module with temporary argv state."""
    original_argv = list(sys.argv)
    try:
        sys.argv = module_argv(argv)
        runpy.run_module(sys.argv[0], run_name="__main__", alter_sys=True)
    finally:
        sys.argv = original_argv


def main(argv: Sequence[str] | None = None) -> int:
    """Dispatch to a planner module while preserving CLI-style execution."""
    try:
        run_requested_module(active_argv(argv))
    except ValueError as error:
        return write_error(error)
    except SystemExit as exit_signal:
        return exit_code_from_system_exit(exit_signal)
    return SUCCESS_EXIT_CODE


if __name__ == "__main__":
    raise SystemExit(main())
